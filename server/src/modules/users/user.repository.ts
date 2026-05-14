/**
 * User repository — Prisma implementation of IUserRepository.
 *
 * Purpose:
 * - findByUsernameWithCounts: profile with _count (tweets, followers, following)
 * - findIdByUsername: lightweight lookup for cross-module queries
 * - isFollowing: check if one user follows another
 * - countLikesReceived: nested aggregate — total likes across all user's tweets
 *
 * Note on likesCount:
 *   Prisma's _count can't compute nested aggregates (User → Tweets → Likes).
 *   We use db.like.count({ where: { tweet: { authorId } } }) which Prisma
 *   compiles to an efficient SQL JOIN, not a subquery.
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: Factory Pattern — createUserRepository(db?) enables mock injection.
 */

import { prisma } from "../../shared/database/index.js";
import type { IUserRepository } from "./user.types.js";

type PrismaInstance = typeof prisma;

// ─── User Repository ─────────────────────────────────────────────────────────

/**
 * Creates an IUserRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to singleton, injectable for tests)
 */
export const createUserRepository = (
  db: PrismaInstance = prisma,
): IUserRepository => ({
  // ── Profile with Counts ──

  findByUsernameWithCounts: (username) =>
    db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        profileImage: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            tweets: true,
            followers: true,   // people who follow ME
            following: true,   // people I follow
          },
        },
      },
    }),

  // ── Lightweight Username Lookup ──

  findIdByUsername: async (username) => {
    const user = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return user?.id ?? null;
  },

  // ── Follow Check ──

  isFollowing: async (followerId, followingId) => {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
      select: { id: true },
    });
    return follow !== null;
  },

  // ── Nested Aggregate: Likes Received ──

  countLikesReceived: (userId) =>
    db.like.count({
      where: { tweet: { authorId: userId } },
    }),
});
