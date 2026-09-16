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
import { isPrismaError } from "../../shared/utils/index.js";
import {
  resolveUserByHandle,
  type ResolvedHandle,
} from "../../shared/identity/index.js";
import {
  mediaOwnership,
  mediaReferences,
  mediaResolution,
  MediaAttachError,
  type IMediaOwnership,
  type IMediaReferences,
  type IMediaResolution,
} from "../media/index.js";
import {
  channelVerificationStatus,
  type IChannelVerificationStatus,
} from "../channel-verification/index.js";
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
  resolveHandle: (handle: string) => Promise<ResolvedHandle | null> = resolveUserByHandle,
  verification: IChannelVerificationStatus = channelVerificationStatus,
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
    avatar: avatarToken === null ? null : { token: avatarToken },
    bio: user.bio,
    tweetsCount: user._count.tweets,
    likesCount,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
    createdAt: user.createdAt,
  });

  /**
   * Validate a requested username change. Returns `null` when nothing changes (no
   * `username` supplied, or the same handle). Throws `409` when the target is held
   * by another account (a current username OR a reserved alias). A target that is
   * the caller's own reserved alias is allowed — a reclaim that frees that alias.
   */
  const planRename = async (
    userId: number,
    requested: string | undefined,
  ): Promise<{ from: string; to: string; reclaimSelfAlias: boolean } | null> => {
    if (requested === undefined) return null;
    const current = await userRepo.findUsername(userId);
    if (!current) throw AppError.notFound("User");
    if (requested === current.username) return null; // no-op — the same handle
    const holder = await resolveHandle(requested);
    if (holder && holder.userId !== userId) {
      throw AppError.conflict("Username already taken");
    }
    return { from: current.username, to: requested, reclaimSelfAlias: holder?.viaAlias ?? false };
  };

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

      const [likesCount, avatarToken, emailVerification] = await Promise.all([
        userRepo.countLikesReceived(userId),
        resolveAvatar(user.avatarMediaId),
        // Asked for, never stored: the account row holds the address, and the
        // capability holds whether it is proven. The subject is handed over
        // from the row already loaded here.
        verification.statusOf(userId, user.email),
      ]);

      // Self-view: the public profile plus `email` and its verification state —
      // both the account holder's own, neither exposed publicly.
      return {
        ...buildResponse(user, avatarToken, likesCount, false),
        email: user.email,
        emailVerification,
      };
    },

    // ─── Update Self Profile ──────────────────────────────────────────

    updateMe: async (userId, data: UpdateMeInput) => {
      // Validate a requested rename up front (uniqueness across current usernames
      // AND reserved aliases). `rename` is null when nothing changes.
      const rename = await planRename(userId, data.username);

      // No avatar edit and no rename → a plain name/bio update, no transaction.
      if (data.avatar === undefined && rename === null) {
        const updated = await userRepo.updateProfile(userId, { name: data.name, bio: data.bio });
        const [likesCount, avatarToken, emailVerification] = await Promise.all([
          userRepo.countLikesReceived(userId),
          resolveAvatar(updated.avatarMediaId),
          verification.statusOf(userId, updated.email),
        ]);
        return {
          ...buildResponse(updated, avatarToken, likesCount, false),
          email: updated.email,
          emailVerification,
        };
      }

      // Avatar coordination (if any) and the atomic rename (if any) commit together
      // in one transaction — a rename and its alias reservation are one unit.
      const avatarEdit = data.avatar; // { token } | null | undefined
      const referrer = avatarReferrer(userId);
      let oldMediaId: number | null = null;
      if (avatarEdit !== undefined) {
        const current = await userRepo.findAvatar(userId);
        if (!current) {
          throw AppError.notFound("User");
        }
        oldMediaId = current.avatarMediaId;
      }

      try {
        const { updated, editedToken } = await runInTransaction(async (tx) => {
          // Rename: free a self-alias being reclaimed, then reserve the old handle.
          if (rename) {
            if (rename.reclaimSelfAlias) {
              await userRepo.releaseAlias(rename.to, tx);
            }
            await userRepo.reserveUsername(userId, rename.from, tx);
          }

          // Avatar set / replace / remove — only when an avatar edit is present.
          // `undefined` leaves the reference untouched in the write below.
          let newMediaId: number | null | undefined;
          let editedToken: string | null = null;
          if (avatarEdit !== undefined) {
            newMediaId = null;
            if (avatarEdit !== null) {
              // Lock + authorize (returns the authoritative metadata), then evaluate
              // the avatar policy UNDER the lock, before the reference begins.
              const attached = await media.ownership.authorizeAttach(
                { token: avatarEdit.token, ownerId: userId },
                tx,
              );
              assertAvatarPolicy(attached.contentType, attached.size);
              newMediaId = attached.referenceId;
              editedToken = attached.token;
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
          }

          const updated = await userRepo.updateProfile(
            userId,
            { name: data.name, bio: data.bio, username: rename?.to, avatarMediaId: newMediaId },
            tx,
          );
          return { updated, editedToken };
        });

        const [likesCount, avatarToken, emailVerification] = await Promise.all([
          userRepo.countLikesReceived(userId),
          // No avatar edit → resolve the current avatar; otherwise use the edit's token.
          avatarEdit === undefined ? resolveAvatar(updated.avatarMediaId) : Promise.resolve(editedToken),
          verification.statusOf(userId, updated.email),
        ]);
        return {
          ...buildResponse(updated, avatarToken, likesCount, false),
          email: updated.email,
          emailVerification,
        };
      } catch (err) {
        if (isPrismaError(err, "P2002")) {
          throw AppError.conflict("Username already taken");
        }
        throw asAttachFailure(err);
      }
    },
  };
};
