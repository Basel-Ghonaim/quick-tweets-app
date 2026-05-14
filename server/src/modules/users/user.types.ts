/**
 * User module type definitions — interfaces and data shapes.
 *
 * Purpose:
 * - Defines DTOs for API responses (UserProfileResponse)
 * - Defines IUserRepository interface (database operations)
 * - Defines IUserService interface (business logic contract)
 *
 * Note: User's tweets reuse TweetResponse from the tweets module.
 *       Cursor pagination types come from shared/types/.
 *
 * Principle: DIP — service depends on IUserRepository, not on Prisma.
 * Principle: ISP — repository and service contracts are separate.
 */

import type { CursorParams, CursorMeta } from "../../shared/types/index.js";
import type { TweetResponse } from "../tweets/tweet.types.js";

// Re-export for convenience
export type { CursorParams, CursorMeta, TweetResponse };

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** Full user profile returned to the frontend. */
export interface UserProfileResponse {
  id: number;
  username: string;
  name: string;
  profileImage: string | null;
  bio: string;
  tweetsCount: number;
  likesCount: number;      // total likes received across all user's tweets
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;    // does req.userId follow this profile?
  createdAt: Date;
}

// ─── Raw DB Types ────────────────────────────────────────────────────────────

/** User from DB with _count for aggregated counts. */
export interface UserWithCounts {
  id: number;
  username: string;
  name: string;
  profileImage: string | null;
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

  /** Find user ID by username (lightweight lookup for tweet queries). */
  findIdByUsername(username: string): Promise<number | null>;

  /** Check if followerId follows followingId. */
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  /** Count total likes received across all user's tweets. */
  countLikesReceived(userId: number): Promise<number>;
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

  getUserTweets(
    username: string,
    params: CursorParams,
    reqUserId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }>;
}
