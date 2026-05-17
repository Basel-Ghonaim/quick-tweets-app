/**
 * User service — business logic for user profile and user tweets.
 *
 * Purpose:
 * - getProfile(): fetch user with counts + isFollowing + likesCount (two-step)
 * - getUserTweets(): resolve username → authorId → delegate to tweet service
 *
 * Cross-module delegation:
 *   getUserTweets calls ITweetService.getByAuthor() — the user service resolves
 *   the username to an authorId, then delegates pagination + DTO mapping to the
 *   tweet service. This respects module boundaries: the user service never
 *   touches the tweet repository directly.
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on IUserRepository and ITweetService interfaces.
 * Principle: Factory Pattern — createUserService(userRepo?, tweetService?) for DI.
 */

import { AppError } from "../../shared/errors/index.js";
import { createUserRepository } from "./user.repository.js";
import { createTweetService } from "../tweets/tweet.service.js";
import type { ITweetService, TweetResponse } from "../tweets/tweet.types.js";
import type { CursorParams, CursorMeta } from "../../shared/types/index.js";
import type {
  IUserRepository,
  IUserService,
  UserProfileResponse,
} from "./user.types.js";

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IUserService with injected dependencies.
 *
 * @param userRepo - User database operations
 * @param tweetService - Tweet business logic (for user tweets endpoint)
 */
export const createUserService = (
  userRepo: IUserRepository = createUserRepository(),
  tweetService: ITweetService = createTweetService(),
): IUserService => ({
  // ─── Profile ────────────────────────────────────────────────────────

  getProfile: async (
    username: string,
    reqUserId?: number,
  ): Promise<UserProfileResponse> => {
    // 1. Fetch user with counts
    const user = await userRepo.findByUsernameWithCounts(username);
    if (!user) {
      throw AppError.notFound("User");
    }

    // 2. Run isFollowing + likesCount in parallel
    const [isFollowing, likesCount] = await Promise.all([
      reqUserId ? userRepo.isFollowing(reqUserId, user.id) : false,
      userRepo.countLikesReceived(user.id),
    ]);

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      profileImage: user.profileImage,
      bio: user.bio,
      tweetsCount: user._count.tweets,
      likesCount,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
      createdAt: user.createdAt,
    };
  },

  // ─── User Tweets (cursor-paginated) ─────────────────────────────────

  getUserTweets: async (
    username: string,
    params: CursorParams,
    reqUserId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }> => {
    // 1. Resolve username → authorId
    const authorId = await userRepo.findIdByUsername(username);
    if (authorId === null) {
      throw AppError.notFound("User");
    }

    // 2. Delegate to tweet service — respects module boundary
    return tweetService.getByAuthor(authorId, params, reqUserId);
  },
});
