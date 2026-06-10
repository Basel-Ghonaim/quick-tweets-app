/**
 * User service — business logic for user profile and user tweets.
 *
 * Purpose:
 * - getProfile(): fetch user with counts + isFollowing + likesCount (two-step)
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on IUserRepository interface.
 * Principle: Factory Pattern — createUserService(userRepo?) for DI.
 */

import { AppError } from "../../shared/errors/index.js";
import { createUserRepository } from "./user.repository.js";
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
 */
export const createUserService = (
  userRepo: IUserRepository = createUserRepository(),
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
});
