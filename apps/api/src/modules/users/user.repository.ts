/**
 * User repository — Prisma implementation of IUserRepository.
 *
 * Purpose:
 * - findByUsernameWithCounts / findByIdWithCounts: profile with _count
 * - countLikesReceived: nested aggregate — total likes across all user's tweets
 * - findAvatar / updateProfile: the avatar/profile write path (WI-2)
 *
 * Note on likesCount:
 *   Prisma's _count can't compute nested aggregates (User → Tweets → Likes).
 *   We use db.like.count({ where: { tweet: { authorId } } }) which Prisma
 *   compiles to an efficient SQL JOIN, not a subquery.
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: Factory Pattern — createUserRepository(db?) enables mock injection.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { IUserRepository } from "./user.types.js";

type PrismaInstance = typeof prisma;

/** The profile projection shared by the username / id / update reads. */
const profileSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatarMediaId: true,
  bio: true,
  createdAt: true,
  _count: {
    select: {
      tweets: true,
      followers: true,   // people who follow ME
      following: true,   // people I follow
    },
  },
} satisfies Prisma.UserSelect;

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
    db.user.findUnique({ where: { username }, select: profileSelect }),

  findByIdWithCounts: (userId) =>
    db.user.findUnique({ where: { id: userId }, select: profileSelect }),

  // ── Nested Aggregate: Likes Received ──

  countLikesReceived: (userId) =>
    db.like.count({
      where: { tweet: { authorId: userId } },
    }),

  // ── Avatar / Profile Write ──

  findAvatar: (userId, client: DbClient = db) =>
    client.user.findUnique({ where: { id: userId }, select: { avatarMediaId: true } }),

  updateProfile: (userId, data, client: DbClient = db) =>
    client.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        // Set the avatar reference exactly when provided — including to `null`
        // (remove). Omitted leaves it untouched.
        ...(data.avatarMediaId !== undefined ? { avatarMediaId: data.avatarMediaId } : {}),
      },
      select: profileSelect,
    }),

  // ── Username history / reservation ──

  findUsername: (userId, client: DbClient = db) =>
    client.user.findUnique({ where: { id: userId }, select: { username: true } }),

  reserveUsername: async (userId, username, client: DbClient = db) => {
    await client.usernameAlias.create({ data: { username, userId } });
  },

  releaseAlias: async (username, client: DbClient = db) => {
    await client.usernameAlias.deleteMany({ where: { username } });
  },
});
