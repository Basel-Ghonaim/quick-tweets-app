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
 *
 * Principle: DIP — service depends on IFollowRepository, not on Prisma.
 * Principle: ISP — repository and service contracts are separate.
 */

import type { CursorParams, CursorMeta } from "../../shared/types/index.js";

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** Returned after follow/unfollow action. */
export interface FollowActionResponse {
  isFollowing: boolean;
  followersCount: number;
}

/** A single user item in follower/following lists. */
export interface FollowUserItem {
  id: number;
  username: string;
  name: string;
  profileImage: string | null;
  bio: string;
}

// ─── Raw DB Types ────────────────────────────────────────────────────────────

/** Follow record with the related user data for list queries.
 *  Each query only includes one side (follower OR following). */
export interface FollowWithUser {
  id: number;
  follower?: FollowUserItem;
  following?: FollowUserItem;
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

  getFollowers(
    username: string,
    params: CursorParams,
  ): Promise<{ data: FollowUserItem[]; meta: CursorMeta }>;

  getFollowing(
    username: string,
    params: CursorParams,
  ): Promise<{ data: FollowUserItem[]; meta: CursorMeta }>;
}
