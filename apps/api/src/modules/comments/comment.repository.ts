/**
 * Comment repository — Prisma implementation of ICommentRepository.
 *
 * Purpose:
 * - Comment CRUD with cursor pagination (n+1 slice)
 * - Author embed, reply and like tallies included in all read queries
 * - The reader's own like included only when a reader is known
 *
 * Cursor pagination:
 *   take = limit + 1; the service uses the extra row to set hasMore.
 *
 * Both lists order and cursor on `id`, which rises with creation, so `id ASC` is
 * already conversation order and a unique, stable cursor with no createdAt ties
 * to break — the answer Finding 0003 reached for the feed.
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: Factory Pattern — createCommentRepository(db?) enables mock injection.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import type { CursorParams, ICommentRepository } from "./comment.types.js";

type PrismaInstance = typeof prisma;

// ─── Shared Include ──────────────────────────────────────────────────────────

/**
 * Author snapshot and tallies included in every comment query, plus the reader's
 * own like when a reader is known. A guest's query omits `likes` entirely, which
 * is why an absent array means "nobody asked", never "not liked".
 */
const commentInclude = (userId?: number) => ({
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      avatarMediaId: true,
    },
  },
  // Counted in the same query rather than stored: a duplicated tally drifts the
  // moment a reply or a like is removed by any path that forgets it.
  _count: { select: { replies: true, likes: true } },
  ...(userId ? { likes: { where: { userId }, select: { userId: true } } } : {}),
});

/** The n+1 slice and cursor clause both lists share. */
const page = ({ cursor, limit }: CursorParams) => ({
  take: limit + 1,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  orderBy: { id: "asc" as const },
});

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

  // ── The thread: a tweet's top-level comments ──

  findThread: (tweetId, params, userId) =>
    db.comment.findMany({
      where: { tweetId, parentId: null },
      ...page(params),
      include: commentInclude(userId),
    }),

  // ── A comment's replies ──

  findReplies: (parentId, params, userId) =>
    db.comment.findMany({
      where: { parentId },
      ...page(params),
      include: commentInclude(userId),
    }),

  // ── Parent lookup (existence + level) ──

  findParent: (id) =>
    db.comment.findUnique({
      where: { id },
      select: { id: true, tweetId: true, parentId: true },
    }),

  // ── Existence check, for the like guard ──

  commentExists: async (id) =>
    (await db.comment.findUnique({ where: { id }, select: { id: true } })) !== null,

  // ── Like Operations ──

  createLike: async (userId, commentId) => {
    await db.commentLike.create({ data: { userId, commentId } });
  },

  deleteLike: async (userId, commentId) => {
    await db.commentLike.delete({ where: { userId_commentId: { userId, commentId } } });
  },

  getLikesCount: (commentId) => db.commentLike.count({ where: { commentId } }),

  // ── Single Comment ──

  findById: (id, userId) =>
    db.comment.findUnique({
      where: { id },
      include: commentInclude(userId),
    }),

  // ── Create ──

  create: (data, client: DbClient = db) =>
    client.comment.create({
      data: {
        authorId: data.authorId,
        tweetId: data.tweetId,
        body: data.body,
        mediaId: data.mediaId ?? null,
        parentId: data.parentId ?? null,
      },
      include: commentInclude(),
    }),

  // ── Update ──

  update: (id, data, client: DbClient = db, userId) =>
    client.comment.update({
      where: { id },
      data,
      include: commentInclude(userId),
    }),

  // ── Delete ──

  delete: async (id, client: DbClient = db) => {
    await client.comment.delete({ where: { id } });
  },

  // ── Ownership Check (lightweight) ──

  findOwner: (id, client: DbClient = db) =>
    client.comment.findUnique({
      where: { id },
      // The body rides this check rather than costing a query of its own:
      // deciding whether the text changed needs the stored text.
      select: { authorId: true, mediaId: true, parentId: true, body: true },
    }),

  // ── Reply-deletion helpers (used when a top-level comment goes) ──

  findReplyMediaRefs: (parentId, client: DbClient = db) =>
    client.comment.findMany({
      where: { parentId, mediaId: { not: null } },
      select: { id: true, mediaId: true },
    }) as Promise<{ id: number; mediaId: number }[]>,

  deleteRepliesOf: async (parentId, client: DbClient = db) => {
    const { count } = await client.comment.deleteMany({ where: { parentId } });
    return count;
  },

  // ── Dependent-deletion helpers (used by the tweet-deletion use-case) ──

  findMediaRefsByTweet: (tweetId, client: DbClient = db) =>
    client.comment.findMany({
      where: { tweetId, mediaId: { not: null } },
      select: { id: true, mediaId: true },
    }) as Promise<{ id: number; mediaId: number }[]>,

  deleteRepliesByTweet: async (tweetId, client: DbClient = db) => {
    const { count } = await client.comment.deleteMany({
      where: { tweetId, parentId: { not: null } },
    });
    return count;
  },

  deleteByTweet: async (tweetId, client: DbClient = db) => {
    const { count } = await client.comment.deleteMany({ where: { tweetId } });
    return count;
  },
});
