/**
 * Tweet repository — Prisma implementation of ITweetRepository.
 *
 * Purpose:
 * - Tweet CRUD with cursor pagination and author/counts includes
 * - Like operations (find, create, delete, count)
 *
 * Cursor pagination uses the "n+1 trick":
 *   Fetch limit+1 items. If we get limit+1 back, hasMore=true, slice to limit.
 *   This avoids a separate COUNT(*) query for every page.
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: Factory Pattern — createTweetRepository(db?) enables mock injection.
 */

import { prisma } from "../../shared/database/index.js";
import type { ITweetRepository, CursorParams } from "./tweet.types.js";

type PrismaInstance = typeof prisma;

// ─── Shared Include ──────────────────────────────────────────────────────────

/**
 * Builds the Prisma include object for tweet queries.
 * Includes author embed, like/comment counts, and optionally the user's like.
 */
const buildTweetInclude = (userId?: number) => ({
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
  // If logged in, include whether this user liked the tweet
  ...(userId
    ? { likes: { where: { userId }, select: { userId: true } } }
    : {}),
});

// ─── Tweet Repository ────────────────────────────────────────────────────────

/**
 * Creates an ITweetRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to singleton, injectable for tests)
 */
export const createTweetRepository = (
  db: PrismaInstance = prisma,
): ITweetRepository => ({
  // ── Feed / List ──

  findMany: async (params: CursorParams, userId?: number) => {
    const { cursor, limit } = params;

    return db.tweet.findMany({
      // n+1 trick: fetch one extra to determine hasMore
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: buildTweetInclude(userId),
    });
  },

  // ── User's Tweets ──

  findByAuthor: async (authorId: number, params: CursorParams, userId?: number) => {
    const { cursor, limit } = params;

    return db.tweet.findMany({
      where: { authorId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: buildTweetInclude(userId),
    });
  },

  // ── Single Tweet ──

  findById: (id, userId?) =>
    db.tweet.findUnique({
      where: { id },
      include: buildTweetInclude(userId),
    }),

  // ── Create ──

  create: (authorId, body) =>
    db.tweet.create({
      data: { authorId, body },
      include: buildTweetInclude(authorId),
    }),

  // ── Update ──

  update: (id, data) =>
    db.tweet.update({
      where: { id },
      data,
      include: buildTweetInclude(),
    }),

  // ── Delete ──

  delete: async (id) => {
    await db.tweet.delete({ where: { id } });
  },

  // ── Like Operations ──

  findLike: (userId, tweetId) =>
    db.like.findUnique({
      where: { userId_tweetId: { userId, tweetId } },
      select: { id: true },
    }),

  createLike: async (userId, tweetId) => {
    await db.like.create({ data: { userId, tweetId } });
  },

  deleteLike: async (userId, tweetId) => {
    await db.like.delete({
      where: { userId_tweetId: { userId, tweetId } },
    });
  },

  getLikesCount: async (tweetId) => {
    return db.like.count({ where: { tweetId } });
  },
});
