/**
 * The comment thread against a REAL Postgres. Run with `npm run test:integration`.
 *
 * These are the facts the unit lane cannot own, because each depends on what the
 * database actually does rather than on the service's inputs:
 *
 *   - the cascade is one transaction, and a failure inside it leaves nothing;
 *   - the RESTRICT foreign key really refuses a bypass;
 *   - a page is stable when a comment is inserted between two reads;
 *   - a post's comment count aggregates both levels.
 *
 * TAG-scoped: every row this file makes carries the tag, and only tagged rows
 * are removed afterwards, so a shared database is safe.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { mediaReferences } from "../media/index.js";
import { createCommentService } from "./comment.service.js";

const TAG = `itthread${process.pid}x${Math.floor(process.hrtime()[1])}`;
const svc = createCommentService();

let reachable = false;
let authorId = 0;
let tweetId = 0;
let seq = 0;

/** A real, ready media object owned by the author — the thing a reference points at. */
const makeMedia = async () => {
  seq += 1;
  const obj = await prisma.mediaObject.create({
    data: {
      token: `${TAG}-tok-${seq}`,
      storageKey: `objects/${TAG}-${seq}`,
      contentType: "image/png",
      size: 10,
      status: "ready",
      uploaderId: authorId,
    },
  });
  return obj.id;
};

/** A comment row, written directly so a case can arrange a shape in one step. */
const makeComment = async (over: { parentId?: number; mediaId?: number; body?: string } = {}) =>
  prisma.comment.create({
    data: {
      body: over.body ?? `${TAG} body`,
      authorId,
      tweetId,
      parentId: over.parentId ?? null,
      mediaId: over.mediaId ?? null,
    },
    select: { id: true },
  });

const referrersFor = async (mediaIds: number[]) =>
  (
    await prisma.mediaReference.findMany({
      where: { mediaId: { in: mediaIds } },
      select: { referrer: true },
    })
  )
    .map((r) => r.referrer)
    .sort();

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: TAG, email: `${TAG}@it.local`, passwordHash: "x" },
  });
  authorId = user.id;
  const tweet = await prisma.tweet.create({ data: { body: `${TAG} post`, authorId } });
  tweetId = tweet.id;
}, 30_000);

afterAll(async () => {
  if (reachable) {
    // Replies before parents: the parent foreign key is RESTRICT, and this
    // cleanup is bound by it exactly as production is.
    await prisma.comment.deleteMany({ where: { tweetId, parentId: { not: null } } });
    await prisma.comment.deleteMany({ where: { tweetId } });
    await prisma.tweet.deleteMany({ where: { authorId } });
    await prisma.mediaReference.deleteMany({
      where: { media: { token: { startsWith: TAG } } },
    });
    await prisma.mediaObject.deleteMany({ where: { token: { startsWith: TAG } } });
    await prisma.user.deleteMany({ where: { username: TAG } });
  }
  await prisma.$disconnect();
});

describe("deleting a comment — the cascade the database honours", () => {
  it("removes the replies with their parent, and ends every reference first", async () => {
    if (!reachable) return;

    const parentMedia = await makeMedia();
    const replyMedia = await makeMedia();
    const parent = await makeComment({ mediaId: parentMedia });
    const reply = await makeComment({ parentId: parent.id, mediaId: replyMedia });
    const plainReply = await makeComment({ parentId: parent.id });

    await mediaReferences.referenceBegan({ mediaId: parentMedia, referrer: `comment:${parent.id}` });
    await mediaReferences.referenceBegan({ mediaId: replyMedia, referrer: `comment:${reply.id}` });

    await svc.delete(parent.id, authorId);

    const left = await prisma.comment.findMany({
      where: { id: { in: [parent.id, reply.id, plainReply.id] } },
      select: { id: true },
    });
    expect(left).toEqual([]);

    // The ledger is the point: a row removed while Media still believed the
    // object referenced would leak it permanently.
    expect(await referrersFor([parentMedia, replyMedia])).toEqual([]);

    // The objects themselves survive, now unreferenced — reclamation's to take.
    const objects = await prisma.mediaObject.findMany({
      where: { id: { in: [parentMedia, replyMedia] } },
      select: { status: true },
    });
    expect(objects.map((o) => o.status)).toEqual(["ready", "ready"]);
  });

  it("leaves nothing half-done when the reference signal fails mid-chain", async () => {
    if (!reachable) return;

    const replyMedia = await makeMedia();
    const parent = await makeComment();
    const reply = await makeComment({ parentId: parent.id, mediaId: replyMedia });
    await mediaReferences.referenceBegan({ mediaId: replyMedia, referrer: `comment:${reply.id}` });

    // A Media port that refuses exactly once the cascade has begun.
    const failing = createCommentService(undefined, {
      ownership: (await import("../media/index.js")).mediaOwnership,
      references: {
        ...mediaReferences,
        referenceEnded: async () => {
          throw new Error("ledger unavailable");
        },
      },
      resolution: (await import("../media/index.js")).mediaResolution,
    });

    await expect(failing.delete(parent.id, authorId)).rejects.toThrow("ledger unavailable");

    // Both rows are still there, and so is the reference.
    const left = await prisma.comment.findMany({
      where: { id: { in: [parent.id, reply.id] } },
      select: { id: true },
    });
    expect(left).toHaveLength(2);
    expect(await referrersFor([replyMedia])).toEqual([`comment:${reply.id}`]);

    // Clean this case's rows up through the real path.
    await svc.delete(parent.id, authorId);
  });

  it("refuses a raw delete of a comment that still has replies", async () => {
    if (!reachable) return;

    const parent = await makeComment();
    const reply = await makeComment({ parentId: parent.id });

    // The backstop: any path that bypasses the coordinated use-case meets the
    // foreign key loudly instead of leaking silently.
    await expect(prisma.comment.delete({ where: { id: parent.id } })).rejects.toThrow();

    await prisma.comment.delete({ where: { id: reply.id } });
    await prisma.comment.delete({ where: { id: parent.id } });
  });
});

describe("deleting the tweet — both levels go", () => {
  it("removes replies and their parents, ending both reference families", async () => {
    if (!reachable) return;

    const own = await prisma.tweet.create({ data: { body: `${TAG} doomed`, authorId } });
    const media = await makeMedia();
    const parent = await prisma.comment.create({
      data: { body: `${TAG} p`, authorId, tweetId: own.id },
      select: { id: true },
    });
    const reply = await prisma.comment.create({
      data: { body: `${TAG} r`, authorId, tweetId: own.id, parentId: parent.id, mediaId: media },
      select: { id: true },
    });
    await mediaReferences.referenceBegan({ mediaId: media, referrer: `comment:${reply.id}` });

    await prisma.$transaction(async (tx) => {
      await svc.deleteForTweet(own.id, tx);
      await tx.tweet.delete({ where: { id: own.id } });
    });

    expect(await prisma.comment.count({ where: { tweetId: own.id } })).toBe(0);
    expect(await referrersFor([media])).toEqual([]);
  });
});

describe("the thread's pages", () => {
  it("returns top-level comments oldest first, and never a reply", async () => {
    if (!reachable) return;

    const own = await prisma.tweet.create({ data: { body: `${TAG} paged`, authorId } });
    const a = await prisma.comment.create({
      data: { body: `${TAG} a`, authorId, tweetId: own.id },
      select: { id: true },
    });
    const b = await prisma.comment.create({
      data: { body: `${TAG} b`, authorId, tweetId: own.id },
      select: { id: true },
    });
    const r = await prisma.comment.create({
      data: { body: `${TAG} r`, authorId, tweetId: own.id, parentId: a.id },
      select: { id: true },
    });

    const { data } = await svc.getThread(own.id, { limit: 10 });
    expect(data.map((c) => c.id)).toEqual([a.id, b.id]);
    expect(data.map((c) => c.repliesCount)).toEqual([1, 0]);

    const replies = await svc.getReplies(a.id, { limit: 10 });
    expect(replies.data.map((c) => c.id)).toEqual([r.id]);

    await prisma.comment.delete({ where: { id: r.id } });
    await prisma.comment.deleteMany({ where: { tweetId: own.id } });
    await prisma.tweet.delete({ where: { id: own.id } });
  });

  it("neither skips nor repeats a comment when one is added between two pages", async () => {
    if (!reachable) return;

    const own = await prisma.tweet.create({ data: { body: `${TAG} live`, authorId } });
    const made: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const c = await prisma.comment.create({
        data: { body: `${TAG} ${i}`, authorId, tweetId: own.id },
        select: { id: true },
      });
      made.push(c.id);
    }

    const first = await svc.getThread(own.id, { limit: 2 });
    expect(first.data.map((c) => c.id)).toEqual([made[0], made[1]]);

    // A reader is mid-scroll and the conversation moves on. With page numbers
    // this insert shifts every later page; the cursor is anchored to a row.
    const added = await prisma.comment.create({
      data: { body: `${TAG} late`, authorId, tweetId: own.id },
      select: { id: true },
    });

    const second = await svc.getThread(own.id, { cursor: Number(first.meta.nextCursor), limit: 2 });
    expect(second.data.map((c) => c.id)).toEqual([made[2], made[3]]);

    const third = await svc.getThread(own.id, { cursor: Number(second.meta.nextCursor), limit: 2 });
    expect(third.data.map((c) => c.id)).toEqual([added.id]);

    // Every comment seen exactly once, the new one included.
    const seen = [...first.data, ...second.data, ...third.data].map((c) => c.id);
    expect(seen).toEqual([...made, added.id]);
    expect(new Set(seen).size).toBe(seen.length);

    await prisma.comment.deleteMany({ where: { tweetId: own.id } });
    await prisma.tweet.delete({ where: { id: own.id } });
  });
});

describe("a post's comment count", () => {
  it("counts replies as well as comments, because a reply keeps its tweetId", async () => {
    if (!reachable) return;

    const own = await prisma.tweet.create({ data: { body: `${TAG} counted`, authorId } });
    const parent = await prisma.comment.create({
      data: { body: `${TAG} p`, authorId, tweetId: own.id },
      select: { id: true },
    });
    await prisma.comment.createMany({
      data: [
        { body: `${TAG} r1`, authorId, tweetId: own.id, parentId: parent.id },
        { body: `${TAG} r2`, authorId, tweetId: own.id, parentId: parent.id },
      ],
    });

    // The same aggregate the tweet mapper reads — one comment and two replies.
    const counted = await prisma.tweet.findUnique({
      where: { id: own.id },
      select: { _count: { select: { comments: true } } },
    });
    expect(counted?._count.comments).toBe(3);

    await prisma.comment.deleteMany({ where: { tweetId: own.id, parentId: { not: null } } });
    await prisma.comment.deleteMany({ where: { tweetId: own.id } });
    await prisma.tweet.delete({ where: { id: own.id } });
  });
});
