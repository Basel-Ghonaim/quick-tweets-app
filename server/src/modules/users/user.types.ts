/**
 * User module type definitions — interfaces and data shapes.
 *
 * Purpose:
 * - Defines DTOs for API responses (UserProfileResponse)
 * - Defines IUserRepository interface (database operations)
 * - Defines IUserService interface (business logic contract)
 *
 * Principle: DIP — service depends on IUserRepository, not on Prisma.
 * Principle: ISP — repository and service contracts are separate.
 */

import type { DbClient } from "../../shared/database/index.js";

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** Full user profile returned to the frontend. */
export interface UserProfileResponse {
  id: number;
  username: string;
  name: string;
  /** @deprecated Always `null`. Superseded by `avatar`; removed with the #335 tail. */
  profileImage: string | null;
  /** The resolved avatar read token, or `null`. Set/changed via `PATCH /users/me`. */
  avatar: { token: string } | null;
  bio: string;
  tweetsCount: number;
  likesCount: number;      // total likes received across all user's tweets
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;    // does req.userId follow this profile?
  createdAt: Date;
}

// ─── Request Shapes ──────────────────────────────────────────────────────────

/**
 * A profile update. Any subset of fields may be present (at least one). The
 * avatar uses **full-replacement** semantics: omitted = unchanged, `{ token }` =
 * set/replace, `null` = remove (ADR 0008 Decision 5).
 */
export interface UpdateMeInput {
  name?: string;
  bio?: string;
  avatar?: { token: string } | null;
}

// ─── Raw DB Types ────────────────────────────────────────────────────────────

/** User from DB with _count for aggregated counts. */
export interface UserWithCounts {
  id: number;
  username: string;
  name: string;
  profileImage: string | null;
  /** Bare Media Reference (MediaObject.id) — resolved to a token at the boundary. */
  avatarMediaId: number | null;
  bio: string;
  createdAt: Date;
  _count: {
    tweets: number;
    followers: number;  // people who follow ME
    following: number;  // people I follow
  };
}

// ─── Repository Interface ────────────────────────────────────────────────────

/**
 * IUserRepository — database operations contract for users.
 *
 * Consumed by: UserService
 * Implemented by: createUserRepository (user.repository.ts)
 */
export interface IUserRepository {
  /** Find user by username with aggregated counts. */
  findByUsernameWithCounts(username: string): Promise<UserWithCounts | null>;

  /** Find the current user by id with aggregated counts (self profile). */
  findByIdWithCounts(userId: number): Promise<UserWithCounts | null>;

  /** Check if followerId follows followingId. */
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  /** Count total likes received across all user's tweets. */
  countLikesReceived(userId: number): Promise<number>;

  /** The user's current avatar reference (for the set-difference); `null` if the user is absent. */
  findAvatar(userId: number, client?: DbClient): Promise<{ avatarMediaId: number | null } | null>;

  /**
   * Update `name`/`bio` and/or the avatar reference. Only provided fields change;
   * `avatarMediaId` is set exactly when the caller passes it (including to `null`).
   * Runs in the caller's transaction so avatar coordination is atomic.
   */
  updateProfile(
    userId: number,
    data: { name?: string; bio?: string; avatarMediaId?: number | null },
    client?: DbClient,
  ): Promise<UserWithCounts>;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/**
 * IUserService — business logic contract for users.
 *
 * Consumed by: UserController
 * Implemented by: createUserService (user.service.ts)
 */
export interface IUserService {
  getProfile(username: string, reqUserId?: number): Promise<UserProfileResponse>;
  getMe(userId: number): Promise<UserProfileResponse>;
  updateMe(userId: number, data: UpdateMeInput): Promise<UserProfileResponse>;
}
