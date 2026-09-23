/**
 * Comment likes against a REAL Postgres. Run with `npm run test:integration`.
 *
 * These are the facts the unit lane cannot own, because each depends on what the
 * database actually does:
 *
 *   - the unique pair really refuses a second like, so repeating is a no-op;
 *   - two concurrent likes leave one row, not two;
 *   - deleting a comment takes its likes, and deleting a tweet takes the likes
 *     of its comments at both levels — by cascade, with nothing in the
 *     application saying so.
 *
 * TAG-scoped: every row this file makes carries the tag, and only tagged rows
 * are removed afterwards, so a shared database is safe.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createCommentService } from "./comment.service.js";

const TAG = `itlike${process.pid}x${Math.floor(process.hrtime()[1])}`;
const svc = createCommentService();

let reachable = false;
let authorId = 0;
let readerId = 0;
let tweetId = 0;

const makeComment = async (over: { parentId?: number; tweetId?: number } = {}) =>
  prisma.comment.create({
    data: {
      body: `${TAG} body`,
      authorId,
      tweetId: over.tweetId ?? tweetId,
      parentId: over.parentId ?? null,
    },
    select: { id: true },
  });

const likeRows = (commentId: number) =>
  prisma.commentLike.count({ where: { commentId } });

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const author = await prisma.user.create({
    data: { username: `${TAG}a`, email: `${TAG}a@it.local`, passwordHash: "x" },
  });
  const reader = await prisma.user.create({
    data: { username: `${TAG}b`, email: `${TAG}b@it.local`, passwordHash: "x" },
  });
  authorId = author.id;
  readerId = reader.id;
  tweetId = (await prisma.tweet.create({ data: { body: `${TAG} post`, authorId } })).id;
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.commentLike.deleteMany({ where: { user: { username: { startsWith: TAG } } } });
    await prisma.comment.deleteMany({ where: { tweetId, parentId: { not: null } } });
    await prisma.comment.deleteMany({ where: { tweetId } });
    await prisma.tweet.deleteMany({ where: { authorId } });
    await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } });
  }
  await prisma.$disconnect();
});

describe("the unique pair is the idempotency", () => {
  it("leaves one row however many times the like is set", async () => {
    if (!reachable) return;
    const c = await makeComment();

    const first = await svc.setLike(readerId, c.id);
    const second = await svc.setLike(readerId, c.id);
    const third = await svc.setLike(readerId, c.id);

    expect([first.liked, second.liked, third.liked]).toEqual([true, true, true]);
    expect([first.likesCount, second.likesCount, third.likesCount]).toEqual([1, 1, 1]);
    expect(await likeRows(c.id)).toBe(1);
  });

  it("clears to nothing, and clearing again is still not an error", async () => {
    if (!reachable) return;
    const c = await makeComment();
    await svc.setLike(readerId, c.id);

    const first = await svc.clearLike(readerId, c.id);
    const second = await svc.clearLike(readerId, c.id);

    expect([first.liked, second.liked]).toEqual([false, false]);
    expect(await likeRows(c.id)).toBe(0);
  });

  it("leaves one row when two likes race, rather than failing one of them", async () => {
    if (!reachable) return;
    const c = await makeComment();

    // Both in flight at once: one wins the insert, the other meets the
    // constraint. Neither caller is told it lost.
    const [a, b] = await Promise.all([
      svc.setLike(readerId, c.id),
      svc.setLike(readerId, c.id),
    ]);

    expect(a.liked).toBe(true);
    expect(b.liked).toBe(true);
    expect(await likeRows(c.id)).toBe(1);
  });

  it("counts one like per reader, not per press", async () => {
    if (!reachable) return;
    const c = await makeComment();

    await svc.setLike(readerId, c.id);
    const both = await svc.setLike(authorId, c.id);

    expect(both.likesCount).toBe(2);
    expect(await likeRows(c.id)).toBe(2);
  });
});

describe("what a reader reads", () => {
  it("shows the count to everyone and the state only to its owner", async () => {
    if (!reachable) return;
    const own = await prisma.tweet.create({ data: { body: `${TAG} read`, authorId } });
    const c = await prisma.comment.create({
      data: { body: `${TAG} c`, authorId, tweetId: own.id },
      select: { id: true },
    });
    await svc.setLike(readerId, c.id);

    const asReader = await svc.getThread(own.id, { limit: 10 }, readerId);
    const asOther = await svc.getThread(own.id, { limit: 10 }, authorId);
    const asGuest = await svc.getThread(own.id, { limit: 10 });

    expect(asReader.data[0]!.isLiked).toBe(true);
    expect(asOther.data[0]!.isLiked).toBe(false);
    expect(asGuest.data[0]!.isLiked).toBe(false);
    // The count is public; only the state is personal.
    expect([asReader, asOther, asGuest].map((r) => r.data[0]!.likesCount)).toEqual([1, 1, 1]);

    await prisma.commentLike.deleteMany({ where: { commentId: c.id } });
    await prisma.comment.deleteMany({ where: { tweetId: own.id } });
    await prisma.tweet.delete({ where: { id: own.id } });
  });

  it("carries the like fields on a reply as well as on a comment", async () => {
    if (!reachable) return;
    const parent = await makeComment();
    const reply = await makeComment({ parentId: parent.id });
    await svc.setLike(readerId, reply.id);

    const { data } = await svc.getReplies(parent.id, { limit: 10 }, readerId);

    expect(data[0]!.id).toBe(reply.id);
    expect(data[0]!.isLiked).toBe(true);
    expect(data[0]!.likesCount).toBe(1);
  });
});

describe("likes go when what they were on goes", () => {
  it("takes a comment's likes with the comment, by cascade", async () => {
    if (!reachable) return;
    const c = await makeComment();
    await svc.setLike(readerId, c.id);
    await svc.setLike(authorId, c.id);
    expect(await likeRows(c.id)).toBe(2);

    await svc.delete(c.id, authorId);

    // Nothing in the application ends these — the foreign key does, which is
    // what a like may have and a comment's media reference may not.
    expect(await likeRows(c.id)).toBe(0);
  });

  it("takes the likes of a comment's replies when the parent goes", async () => {
    if (!reachable) return;
    const parent = await makeComment();
    const reply = await makeComment({ parentId: parent.id });
    await svc.setLike(readerId, parent.id);
    await svc.setLike(readerId, reply.id);

    await svc.delete(parent.id, authorId);

    expect(await likeRows(parent.id)).toBe(0);
    expect(await likeRows(reply.id)).toBe(0);
  });

  it("takes the likes of both levels when the tweet goes", async () => {
    if (!reachable) return;
    const own = await prisma.tweet.create({ data: { body: `${TAG} doomed`, authorId } });
    const parent = await prisma.comment.create({
      data: { body: `${TAG} p`, authorId, tweetId: own.id },
      select: { id: true },
    });
    const reply = await prisma.comment.create({
      data: { body: `${TAG} r`, authorId, tweetId: own.id, parentId: parent.id },
      select: { id: true },
    });
    await svc.setLike(readerId, parent.id);
    await svc.setLike(readerId, reply.id);

    await prisma.$transaction(async (tx) => {
      await svc.deleteForTweet(own.id, tx);
      await tx.tweet.delete({ where: { id: own.id } });
    });

    expect(await likeRows(parent.id)).toBe(0);
    expect(await likeRows(reply.id)).toBe(0);
    expect(await prisma.comment.count({ where: { tweetId: own.id } })).toBe(0);
  });
});

describe("liking what is not there", () => {
  it("404s rather than creating a row against nothing", async () => {
    if (!reachable) return;

    await expect(svc.setLike(readerId, 999_999_999)).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.clearLike(readerId, 999_999_999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
