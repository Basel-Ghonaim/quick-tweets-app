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

import { prisma, type DbClient } from "../../shared/database/index.js";
import { resolveUserByHandle } from "../../shared/identity/index.js";
import type { ITweetRepository } from "./tweet.types.js";
import type { CursorParams } from "../../shared/types/index.js";

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
      avatarMediaId: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
  // Ordered media references. Only the internal reference travels — resolving
  // it to a public read token is Media's, done once per page by the service.
  media: {
    select: { mediaId: true, position: true },
    orderBy: { position: "asc" as const },
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

  // Alias-aware via the single shared resolver: a former handle resolves to the
  // current author, so historical `?author=` links keep working.
  findAuthorIdByUsername: async (username: string) =>
    (await resolveUserByHandle(username, db))?.userId ?? null,

  // ── Single Tweet ──

  findById: (id, userId?) =>
    db.tweet.findUnique({
      where: { id },
      include: buildTweetInclude(userId),
    }),

  // ── Create ──

  create: (authorId, body, client: DbClient = db) =>
    client.tweet.create({
      data: { authorId, body },
      // No userId — isLiked is always false on a newly created tweet
      include: buildTweetInclude(),
    }),

  // ── Update ──

  update: (id, data, userId?, client: DbClient = db) =>
    client.tweet.update({
      where: { id },
      data,
      include: buildTweetInclude(userId),
    }),

  // ── Delete ──

  delete: async (id, client: DbClient = db) => {
    await client.tweet.delete({ where: { id } });
  },

  // ── Media association ──

  findMediaRefs: (tweetId, client: DbClient = db) =>
    client.tweetMedia.findMany({
      where: { tweetId },
      select: { mediaId: true, position: true },
      orderBy: { position: "asc" },
    }),

  replaceMediaRefs: async (tweetId, refs, client: DbClient = db) => {
    // Delete-then-insert rather than an in-place edit: (tweetId, position) is
    // unique, so reordering row by row would collide before the statement ends.
    await client.tweetMedia.deleteMany({ where: { tweetId } });
    if (refs.length > 0) {
      await client.tweetMedia.createMany({
        data: refs.map((ref) => ({ tweetId, mediaId: ref.mediaId, position: ref.position })),
      });
    }
  },

  // ── Ownership Check (lightweight) ──

  findOwner: (id, client: DbClient = db) =>
    client.tweet.findUnique({ where: { id }, select: { authorId: true } }),

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
