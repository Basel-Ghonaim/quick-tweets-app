/**
 * The edited marker against a REAL Postgres. Run with `npm run test:integration`.
 *
 * One fact here cannot be proved anywhere else, and it is the reason the column
 * exists at all: **`updatedAt` moves on a write that is not an edit.** Prisma
 * maintains `@updatedAt` whenever the update carries a field, so re-saving the
 * same words moves it — and a marker derived from it would announce an edit that
 * never happened. Only a real client and a real database show that; a fake
 * repository returns whatever it was handed and proves nothing.
 *
 * TAG-scoped: every row carries the tag, and only tagged rows are removed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createTweetService } from "./tweet.service.js";
import { createCommentService } from "../comments/comment.service.js";

const TAG = `itedit${process.pid}x${Math.floor(process.hrtime()[1])}`;
const tweets = createTweetService();
const comments = createCommentService();

let reachable = false;
let authorId = 0;

const makeTweet = (body: string) =>
  prisma.tweet.create({ data: { body, authorId }, select: { id: true } });

const stored = (id: number) =>
  prisma.tweet.findUniqueOrThrow({
    where: { id },
    select: { body: true, editedAt: true, updatedAt: true },
  });

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
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.comment.deleteMany({ where: { author: { username: TAG } } });
    await prisma.tweet.deleteMany({ where: { authorId } });
    await prisma.user.deleteMany({ where: { username: TAG } });
  }
  await prisma.$disconnect();
});

describe("editedAt and updatedAt come apart", () => {
  it("a fresh post has no edit marker", async () => {
    if (!reachable) return;
    const t = await makeTweet(`${TAG} fresh`);

    expect((await stored(t.id)).editedAt).toBeNull();
  });

  it("a text edit sets the marker, and a read returns it", async () => {
    if (!reachable) return;
    const t = await makeTweet(`${TAG} before`);

    const response = await tweets.update(t.id, authorId, { body: `${TAG} after` });

    expect(response.editedAt).toBeInstanceOf(Date);
    expect((await stored(t.id)).editedAt).toBeInstanceOf(Date);
  });

  it("re-saving the same words moves updatedAt but is not an edit", async () => {
    if (!reachable) return;
    const t = await makeTweet(`${TAG} same`);
    const before = await stored(t.id);
    await new Promise((resolve) => setTimeout(resolve, 5));

    await tweets.update(t.id, authorId, { body: `${TAG} same` });

    const after = await stored(t.id);
    // Prisma maintains @updatedAt whenever the update carries a field, so this
    // write moves it — which is exactly why updatedAt cannot be the marker…
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    // …and exactly why editedAt is a column of its own.
    expect(after.editedAt).toBeNull();
  });

  it("a media-only edit is not an edit either", async () => {
    if (!reachable) return;
    const t = await makeTweet(`${TAG} untouched text`);

    await tweets.update(t.id, authorId, { media: [] });

    const after = await stored(t.id);
    expect(after.editedAt).toBeNull();
    expect(after.body).toBe(`${TAG} untouched text`);
  });

  it("a later media-only edit does not clear a marker already set", async () => {
    if (!reachable) return;
    const t = await makeTweet(`${TAG} first`);
    await tweets.update(t.id, authorId, { body: `${TAG} second` });
    const marked = (await stored(t.id)).editedAt;

    await tweets.update(t.id, authorId, { media: [] });

    const after = await stored(t.id);
    expect(after.editedAt).toEqual(marked); // same instant, not refreshed, not null
  });
});

describe("a comment carries the same marker", () => {
  it("starts null, is set by a text edit, and survives a later media edit", async () => {
    if (!reachable) return;
    const t = await makeTweet(`${TAG} host`);
    const created = await comments.create(authorId, t.id, `${TAG} before`);
    expect(created.editedAt).toBeNull();

    const edited = await comments.update(created.id, authorId, { body: `${TAG} after` });
    expect(edited.editedAt).toBeInstanceOf(Date);

    const unchanged = await comments.update(created.id, authorId, { media: null });
    expect(unchanged.editedAt).toEqual(edited.editedAt);
  });

  it("a reply carries it too", async () => {
    if (!reachable) return;
    const t = await makeTweet(`${TAG} host2`);
    const parent = await comments.create(authorId, t.id, `${TAG} parent`);
    const reply = await comments.create(authorId, t.id, `${TAG} reply`, undefined, parent.id);

    expect(reply.editedAt).toBeNull();
    const edited = await comments.update(reply.id, authorId, { body: `${TAG} reply edited` });
    expect(edited.editedAt).toBeInstanceOf(Date);
  });
});
