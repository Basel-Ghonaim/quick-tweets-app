/**
 * User service — business logic for user profile and the self-profile write path.
 *
 * Purpose:
 * - getProfile(): public profile with counts + isFollowing + resolved avatar
 * - getMe(): the authenticated user's own profile
 * - updateMe(): PATCH name/bio/avatar — avatar is a full-replacement, User-owned
 *   authenticated Media producer (ADR 0008)
 *
 * Avatar mutation (ADR 0008 Decision 8) is **one transaction under one lock**:
 * authorizeAttach(new) takes the FOR UPDATE lock and returns Media's authoritative
 * metadata; the avatar policy is evaluated under that lock; the set-difference
 * reference coordination and the User row update run in the same transaction, so a
 * concurrent reclamation can never tombstone the object between validation and its
 * reference beginning, and any failure rolls the previous avatar state back.
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on IUserRepository + the Media published interfaces.
 * Principle: Factory Pattern — createUserService(...) for DI and testability.
 */

import { AppError } from "../../shared/errors/index.js";
import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import {
  mediaOwnership,
  mediaReferences,
  mediaResolution,
  MediaAttachError,
  type IMediaOwnership,
  type IMediaReferences,
  type IMediaResolution,
} from "../media/index.js";
import { createUserRepository } from "./user.repository.js";
import { assertAvatarPolicy } from "./user.avatar-policy.js";
import type {
  IUserRepository,
  IUserService,
  UpdateMeInput,
  UserProfileResponse,
  UserWithCounts,
} from "./user.types.js";

// ─── Media port ──────────────────────────────────────────────────────────────

/** The Media surfaces the User domain consumes, grouped into one injected dependency. */
export interface UserMediaPort {
  ownership: IMediaOwnership;
  references: IMediaReferences;
  resolution: IMediaResolution;
}

const defaultMediaPort: UserMediaPort = {
  ownership: mediaOwnership,
  references: mediaReferences,
  resolution: mediaResolution,
};

/**
 * The referrer tag under which a user holds its avatar reference. Derived from
 * the immutable user id, so an end signal always matches its begin — the same
 * tag the register-avatar path already uses.
 */
const avatarReferrer = (userId: number): string => `user-avatar:${userId}`;

/** Media that could not be attached is a request problem, not a server fault. */
const asAttachFailure = (err: unknown): unknown =>
  err instanceof MediaAttachError
    ? AppError.validation("Avatar could not be set", {
        avatar: ["The avatar could not be attached; please re-upload and try again"],
      })
    : err;

// ─── Service Factory ─────────────────────────────────────────────────────────

export const createUserService = (
  userRepo: IUserRepository = createUserRepository(),
  media: UserMediaPort = defaultMediaPort,
  runInTransaction: RunInTransaction = defaultRunInTransaction,
): IUserService => {
  /** Resolve a user's avatar reference to its public read token (null when unset/unservable). */
  const resolveAvatar = (avatarMediaId: number | null): Promise<string | null> =>
    avatarMediaId === null ? Promise.resolve(null) : media.resolution.resolveToken(avatarMediaId);

  const buildResponse = (
    user: UserWithCounts,
    avatarToken: string | null,
    likesCount: number,
    isFollowing: boolean,
  ): UserProfileResponse => ({
    id: user.id,
    username: user.username,
    name: user.name,
    profileImage: user.profileImage,
    avatar: avatarToken === null ? null : { token: avatarToken },
    bio: user.bio,
    tweetsCount: user._count.tweets,
    likesCount,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
    createdAt: user.createdAt,
  });

  return {
    // ─── Public Profile ───────────────────────────────────────────────

    getProfile: async (username, reqUserId) => {
      const user = await userRepo.findByUsernameWithCounts(username);
      if (!user) {
        throw AppError.notFound("User");
      }

      const [isFollowing, likesCount, avatarToken] = await Promise.all([
        reqUserId ? userRepo.isFollowing(reqUserId, user.id) : false,
        userRepo.countLikesReceived(user.id),
        resolveAvatar(user.avatarMediaId),
      ]);

      return buildResponse(user, avatarToken, likesCount, isFollowing);
    },

    // ─── Self Profile ─────────────────────────────────────────────────

    getMe: async (userId) => {
      const user = await userRepo.findByIdWithCounts(userId);
      if (!user) {
        throw AppError.notFound("User");
      }

      const [likesCount, avatarToken] = await Promise.all([
        userRepo.countLikesReceived(userId),
        resolveAvatar(user.avatarMediaId),
      ]);

      // Self-view: the public profile plus `email` (owned by the account, not exposed publicly).
      return { ...buildResponse(user, avatarToken, likesCount, false), email: user.email };
    },

    // ─── Update Self Profile ──────────────────────────────────────────

    updateMe: async (userId, data: UpdateMeInput) => {
      // 1a. No avatar edit — name/bio only; no media coordination, no transaction.
      if (data.avatar === undefined) {
        const updated = await userRepo.updateProfile(userId, { name: data.name, bio: data.bio });
        const [likesCount, avatarToken] = await Promise.all([
          userRepo.countLikesReceived(userId),
          resolveAvatar(updated.avatarMediaId),
        ]);
        return { ...buildResponse(updated, avatarToken, likesCount, false), email: updated.email };
      }

      // 1b. Avatar edit (set / replace / remove) — coordinate in one transaction.
      //     Captured in a const so its narrowed type survives inside the closure.
      const avatarEdit = data.avatar;
      const current = await userRepo.findAvatar(userId);
      if (!current) {
        throw AppError.notFound("User");
      }
      const oldMediaId = current.avatarMediaId;
      const referrer = avatarReferrer(userId);

      try {
        const { updated, token } = await runInTransaction(async (tx) => {
          let newMediaId: number | null = null;
          let token: string | null = null;
          if (avatarEdit !== null) {
            // Lock + authorize (WI-1 returns the authoritative metadata), then
            // evaluate the avatar policy UNDER the lock, before the reference begins.
            const attached = await media.ownership.authorizeAttach(
              { token: avatarEdit.token, ownerId: userId },
              tx,
            );
            assertAvatarPolicy(attached.contentType, attached.size);
            newMediaId = attached.referenceId;
            token = attached.token;
          }

          // Signal only a genuine change (single-ref set difference): a resubmit
          // of the same object neither ends nor re-begins.
          if (oldMediaId !== newMediaId) {
            if (oldMediaId !== null) {
              await media.references.referenceEnded({ mediaId: oldMediaId, referrer }, tx);
            }
            if (newMediaId !== null) {
              await media.references.referenceBegan({ mediaId: newMediaId, referrer }, tx);
            }
          }

          const updated = await userRepo.updateProfile(
            userId,
            { name: data.name, bio: data.bio, avatarMediaId: newMediaId },
            tx,
          );
          return { updated, token };
        });

        const likesCount = await userRepo.countLikesReceived(userId);
        return { ...buildResponse(updated, token, likesCount, false), email: updated.email };
      } catch (err) {
        throw asAttachFailure(err);
      }
    },
  };
};
