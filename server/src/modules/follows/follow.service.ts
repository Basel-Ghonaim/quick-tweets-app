/**
 * Follow service — business logic for follow/unfollow and follower/following lists.
 *
 * Purpose:
 * - follow(): self-follow prevention → user exists → not already following → create
 * - unfollow(): user exists → must be following → delete
 * - getFollowers(): user exists → cursor-paginated follower list
 * - getFollowing(): user exists → cursor-paginated following list
 *
 * Design:
 *   - Separate mutations (POST + DELETE) instead of toggle — explicit intent, no race conditions
 *   - Idempotent: the API contract shows 409/400 errors for duplicate follow/already-not-following
 *   - Self-follow prevented with AppError.validation
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on IFollowRepository interface, not Prisma.
 * Principle: Factory Pattern — createFollowService(repo?) for DI and testability.
 */

import { AppError } from "../../shared/errors/index.js";
import { createFollowRepository } from "./follow.repository.js";
import type {
  IFollowRepository,
  IFollowService,
  FollowActionResponse,
  FollowUserItem,
  FollowWithUser,
  CursorParams,
  CursorMeta,
} from "./follow.types.js";

// ─── Helper: Resolve username to userId or throw 404 ─────────────────────────

const resolveUser = async (
  repo: IFollowRepository,
  username: string,
): Promise<number> => {
  const userId = await repo.findUserIdByUsername(username);
  if (userId === null) {
    throw AppError.notFound("User");
  }
  return userId;
};

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IFollowService with injected repository dependency.
 *
 * @param repo - Follow database operations (defaults to Prisma implementation)
 */
export const createFollowService = (
  repo: IFollowRepository = createFollowRepository(),
): IFollowService => ({
  // ─── Follow ─────────────────────────────────────────────────────────

  follow: async (
    reqUserId: number,
    targetUsername: string,
  ): Promise<FollowActionResponse> => {
    // 1. Resolve target user
    const targetId = await resolveUser(repo, targetUsername);

    // 2. Self-follow prevention
    if (reqUserId === targetId) {
      throw AppError.validation("You cannot follow yourself");
    }

    // 3. Already following?
    const alreadyFollowing = await repo.isFollowing(reqUserId, targetId);
    if (alreadyFollowing) {
      throw AppError.conflict("Already following this user");
    }

    // 4. Create follow + get updated count in parallel
    await repo.follow(reqUserId, targetId);
    const followersCount = await repo.countFollowers(targetId);

    return { isFollowing: true, followersCount };
  },

  // ─── Unfollow ───────────────────────────────────────────────────────

  unfollow: async (
    reqUserId: number,
    targetUsername: string,
  ): Promise<FollowActionResponse> => {
    // 1. Resolve target user
    const targetId = await resolveUser(repo, targetUsername);

    // 2. Must be currently following
    const currentlyFollowing = await repo.isFollowing(reqUserId, targetId);
    if (!currentlyFollowing) {
      throw AppError.validation("You are not following this user");
    }

    // 3. Delete follow + get updated count
    await repo.unfollow(reqUserId, targetId);
    const followersCount = await repo.countFollowers(targetId);

    return { isFollowing: false, followersCount };
  },

  // ─── Followers List (cursor-paginated) ──────────────────────────────

  getFollowers: async (
    username: string,
    params: CursorParams,
  ): Promise<{ data: FollowUserItem[]; meta: CursorMeta }> => {
    // 1. Resolve user
    const userId = await resolveUser(repo, username);

    // 2. Fetch with n+1 trick
    const { limit } = params;
    const follows = await repo.getFollowers(userId, params);

    const hasMore = follows.length > limit;
    const sliced = hasMore ? follows.slice(0, limit) : follows;

    // 3. Map to FollowUserItem (extract the follower side)
    const data: FollowUserItem[] = sliced.map((f: FollowWithUser) => f.follower);

    const lastItem = sliced[sliced.length - 1];
    const meta: CursorMeta = {
      nextCursor: hasMore && lastItem ? String(lastItem.id) : null,
      limit,
      hasMore,
    };

    return { data, meta };
  },

  // ─── Following List (cursor-paginated) ──────────────────────────────

  getFollowing: async (
    username: string,
    params: CursorParams,
  ): Promise<{ data: FollowUserItem[]; meta: CursorMeta }> => {
    // 1. Resolve user
    const userId = await resolveUser(repo, username);

    // 2. Fetch with n+1 trick
    const { limit } = params;
    const follows = await repo.getFollowing(userId, params);

    const hasMore = follows.length > limit;
    const sliced = hasMore ? follows.slice(0, limit) : follows;

    // 3. Map to FollowUserItem (extract the following side)
    const data: FollowUserItem[] = sliced.map((f: FollowWithUser) => f.following);

    const lastItem = sliced[sliced.length - 1];
    const meta: CursorMeta = {
      nextCursor: hasMore && lastItem ? String(lastItem.id) : null,
      limit,
      hasMore,
    };

    return { data, meta };
  },
});
