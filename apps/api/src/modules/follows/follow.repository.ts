/**
 * Follow repository — Prisma implementation of IFollowRepository.
 *
 * Purpose:
 * - follow/unfollow: create/delete follow relationships
 * - getFollowers/getFollowing: cursor-paginated user lists
 * - findUserIdByUsername: lightweight lookup for resolving route params
 * - countFollowers: for follow action response
 *
 * Cursor pagination uses the n+1 trick (same pattern as tweets).
 * Lists are ordered by Follow.id DESC (newest follows first).
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: Factory Pattern — createFollowRepository(db?) enables mock injection.
 */

import { prisma } from "../../shared/database/index.js";
import { resolveUserByHandle } from "../../shared/identity/index.js";
import type { CursorParams } from "../../shared/types/index.js";
import type { IFollowRepository } from "./follow.types.js";

type PrismaInstance = typeof prisma;

// ─── Shared User Select ──────────────────────────────────────────────────────

/** User fields selected for follower/following list items. */
const userSelect = {
  id: true,
  username: true,
  name: true,
  avatarMediaId: true,
  bio: true,
} as const;

// ─── Follow Repository ──────────────────────────────────────────────────────

/**
 * Creates an IFollowRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to singleton, injectable for tests)
 */
export const createFollowRepository = (
  db: PrismaInstance = prisma,
): IFollowRepository => ({
  // ── User Lookup ──

  // Alias-aware via the single shared resolver: a former handle resolves to the
  // current user, so historical `/follows/:username` links keep working.
  findUserIdByUsername: async (username) =>
    (await resolveUserByHandle(username, db))?.userId ?? null,

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

  // ── Follow ──

  follow: async (followerId, followingId) => {
    await db.follow.create({
      data: { followerId, followingId },
    });
  },

  // ── Unfollow ──

  unfollow: async (followerId, followingId) => {
    await db.follow.deleteMany({
      where: { followerId, followingId },
    });
  },

  // ── Count Followers ──

  countFollowers: (userId) =>
    db.follow.count({ where: { followingId: userId } }),

  // ── Followers List (cursor-paginated) ──

  getFollowers: (userId, params: CursorParams) => {
    const { cursor, limit } = params;

    return db.follow.findMany({
      where: { followingId: userId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: {
        follower: { select: userSelect },
      },
    });
  },

  // ── Following List (cursor-paginated) ──

  getFollowing: (userId, params: CursorParams) => {
    const { cursor, limit } = params;

    return db.follow.findMany({
      where: { followerId: userId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: {
        following: { select: userSelect },
      },
    });
  },
});
