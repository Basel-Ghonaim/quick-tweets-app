/**
 * User service — business logic for user profile and user tweets.
 *
 * Purpose:
 * - getProfile(): fetch user with counts + isFollowing + likesCount (two-step)
 * - getUserTweets(): resolve username → authorId → tweet repo findByAuthor
 *
 * Cross-module orchestration:
 *   getUserTweets uses ITweetRepository.findByAuthor() and the tweet module's
 *   toTweetResponse DTO transformer. The user service resolves the username to
 *   an authorId, then delegates to the tweet repository.
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on IUserRepository and ITweetRepository interfaces.
 * Principle: Factory Pattern — createUserService(userRepo?, tweetRepo?) for DI.
 */

import { AppError } from "../../shared/errors/index.js";
import { createUserRepository } from "./user.repository.js";
import { createTweetRepository } from "../tweets/tweet.repository.js";
import type { ITweetRepository, TweetWithRelations, TweetResponse } from "../tweets/tweet.types.js";
import type { CursorParams, CursorMeta } from "../../shared/types/index.js";
import type {
  IUserRepository,
  IUserService,
  UserProfileResponse,
} from "./user.types.js";

// ─── Tweet DTO (reuse from tweet module) ─────────────────────────────────────

/** Same transformation used by the tweet service. Kept in sync. */
const toTweetResponse = (tweet: TweetWithRelations): TweetResponse => ({
  id: tweet.id,
  body: tweet.body,
  image: tweet.image,
  author: tweet.author,
  likesCount: tweet._count.likes,
  commentsCount: tweet._count.comments,
  isLiked: (tweet.likes?.length ?? 0) > 0,
  createdAt: tweet.createdAt,
});

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IUserService with injected dependencies.
 *
 * @param userRepo - User database operations
 * @param tweetRepo - Tweet database operations (for user tweets endpoint)
 */
export const createUserService = (
  userRepo: IUserRepository = createUserRepository(),
  tweetRepo: ITweetRepository = createTweetRepository(),
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
      email: user.email,
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

    // 2. Fetch tweets via tweet repository
    const { limit } = params;
    const tweets = await tweetRepo.findByAuthor(authorId, params, reqUserId);

    // 3. Cursor pagination (n+1 trick — same pattern as feed)
    const hasMore = tweets.length > limit;
    const sliced = hasMore ? tweets.slice(0, limit) : tweets;

    const lastItem = sliced[sliced.length - 1];
    const meta: CursorMeta = {
      nextCursor: hasMore && lastItem ? String(lastItem.id) : null,
      limit,
      hasMore,
    };

    return {
      data: sliced.map(toTweetResponse),
      meta,
    };
  },
});
