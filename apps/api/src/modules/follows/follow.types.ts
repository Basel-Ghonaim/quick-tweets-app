/**
 * Follow module type definitions — interfaces and data shapes.
 *
 * Purpose:
 * - Defines DTOs for API responses (FollowActionResponse, FollowUserItem)
 * - Defines IFollowRepository interface (database operations)
 * - Defines IFollowService interface (business logic contract)
 *
 * API contract:
 *   - follow/unfollow return { isFollowing, followersCount }
 *   - followers/following lists use cursor pagination with AuthorEmbed-like shape
 *   - each list item carries the follow state its row's button needs
 *
 * Principle: DIP — service depends on IFollowRepository, not on Prisma.
 * Principle: ISP — repository and service contracts are separate.
 */

import type { CursorMeta, CursorParams } from "../../shared/types/index.js";
import type { AuthorRow } from "../../shared/utils/index.js";

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** Returned after follow/unfollow action. */
export interface FollowActionResponse {
  isFollowing: boolean;
  followersCount: number;
}

/**
 * A single user item in follower/following lists. Carries what the row's Follow
 * button needs: both directions, each `false` for a guest and on the reader's
 * own row.
 */
export interface FollowUserItem {
  id: number;
  username: string;
  name: string | null;
  avatar: { token: string } | null;
  bio: string;
  isFollowing: boolean;
  followsYou: boolean;
}

// ─── Raw DB Types ────────────────────────────────────────────────────────────

/** A listed user as selected, before its avatar reference is resolved. */
export interface FollowUserRow extends AuthorRow {
  bio: string;
}

/** Who suggestions are for, who they must leave out, and how many to return. */
export interface SuggestionQuery {
  /** The signed-in reader; absent for a guest. */
  readerId?: number;
  /** The person whose profile is being viewed, already resolved. */
  excludedId?: number;
  limit: number;
}

/** Follow record with the related user data for list queries.
 *  Each query only includes one side (follower OR following). */
export interface FollowWithUser {
  id: number;
  follower?: FollowUserRow;
  following?: FollowUserRow;
}

// ─── Repository Interface ────────────────────────────────────────────────────

/**
 * IFollowRepository — database operations contract for follows.
 *
 * Consumed by: FollowService
 * Implemented by: createFollowRepository (follow.repository.ts)
 */
export interface IFollowRepository {
  /** Check if a user exists by username. Returns user id or null. */
  findUserIdByUsername(username: string): Promise<number | null>;

  /** Check if followerId follows followingId. */
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  /** Create a follow relationship. */
  follow(followerId: number, followingId: number): Promise<void>;

  /** Delete a follow relationship. */
  unfollow(followerId: number, followingId: number): Promise<void>;

  /** Count followers for a user. */
  countFollowers(userId: number): Promise<number>;

  /** Get followers of a user (cursor-paginated). */
  getFollowers(userId: number, params: CursorParams): Promise<FollowWithUser[]>;

  /** Get users that a user is following (cursor-paginated). */
  getFollowing(userId: number, params: CursorParams): Promise<FollowWithUser[]>;

  /** Accounts to suggest, best first: never the reader, anyone they follow, or `excludedId`. */
  findSuggestions(query: SuggestionQuery): Promise<FollowUserRow[]>;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/**
 * IFollowService — business logic contract for follows.
 *
 * Consumed by: FollowController
 * Implemented by: createFollowService (follow.service.ts)
 */
export interface IFollowService {
  follow(
    reqUserId: number,
    targetUsername: string,
  ): Promise<FollowActionResponse>;

  unfollow(
    reqUserId: number,
    targetUsername: string,
  ): Promise<FollowActionResponse>;

  /** `readerId` is the signed-in reader, if any — it decides each row's follow state. */
  getFollowers(
    username: string,
    params: CursorParams,
    readerId?: number,
  ): Promise<{ data: FollowUserItem[]; meta: CursorMeta }>;

  getFollowing(
    username: string,
    params: CursorParams,
    readerId?: number,
  ): Promise<{ data: FollowUserItem[]; meta: CursorMeta }>;

  /** `readerId` is absent for a guest, who gets the most-followed. Not paged. */
  getSuggestions(
    readerId: number | undefined,
    params: { limit: number; exclude?: string },
  ): Promise<{ data: FollowUserItem[] }>;
}
