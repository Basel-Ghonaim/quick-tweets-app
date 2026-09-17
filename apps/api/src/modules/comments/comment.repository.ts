/**
 * Comment repository — Prisma implementation of ICommentRepository.
 *
 * Purpose:
 * - Comment CRUD with offset pagination (skip/take + count)
 * - Author embed included in all read queries
 *
 * Offset pagination:
 *   page=2, limit=20 → skip=20, take=20
 *   count(tweetId) provides totalRecords for the service to compute totalPages.
 *
 * Comments are ordered by createdAt ASC (oldest first — conversation order).
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: Factory Pattern — createCommentRepository(db?) enables mock injection.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import type { ICommentRepository } from "./comment.types.js";

type PrismaInstance = typeof prisma;

// ─── Shared Include ──────────────────────────────────────────────────────────

/** Author snapshot included in every comment query. */
const commentInclude = {
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      avatarMediaId: true,
    },
  },
} as const;

// ─── Comment Repository ──────────────────────────────────────────────────────

/**
 * Creates an ICommentRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to singleton, injectable for tests)
 */
export const createCommentRepository = (
  db: PrismaInstance = prisma,
): ICommentRepository => ({
  // ── Tweet Existence Check ──

  tweetExists: async (tweetId) => {
    const tweet = await db.tweet.findUnique({
      where: { id: tweetId },
      select: { id: true },
    });
    return tweet !== null;
  },

  // ── List (offset paginated) ──

  findMany: (tweetId, skip, limit) =>
    db.comment.findMany({
      where: { tweetId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: commentInclude,
    }),

  // ── Count (for pagination math) ──

  count: (tweetId) =>
    db.comment.count({ where: { tweetId } }),

  // ── Single Comment ──

  findById: (id, client: DbClient = db) =>
    client.comment.findUnique({
      where: { id },
      include: commentInclude,
    }),

  // ── Create ──

  create: (authorId, tweetId, body, mediaId = null, client: DbClient = db) =>
    client.comment.create({
      data: { authorId, tweetId, body, mediaId },
      include: commentInclude,
    }),

  // ── Update ──

  update: (id, data, client: DbClient = db) =>
    client.comment.update({
      where: { id },
      data,
      include: commentInclude,
    }),

  // ── Delete ──

  delete: async (id, client: DbClient = db) => {
    await client.comment.delete({ where: { id } });
  },

  // ── Ownership Check (lightweight) ──

  findOwner: (id, client: DbClient = db) =>
    client.comment.findUnique({
      where: { id },
      select: { authorId: true, mediaId: true },
    }),

  // ── Dependent-deletion helpers (used by the tweet-deletion use-case) ──

  findMediaRefsByTweet: (tweetId, client: DbClient = db) =>
    client.comment.findMany({
      where: { tweetId, mediaId: { not: null } },
      select: { id: true, mediaId: true },
    }) as Promise<{ id: number; mediaId: number }[]>,

  deleteByTweet: async (tweetId, client: DbClient = db) => {
    const { count } = await client.comment.deleteMany({ where: { tweetId } });
    return count;
  },
});
