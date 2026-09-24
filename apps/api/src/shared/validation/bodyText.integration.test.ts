/**
 * The body columns against a REAL Postgres. Run with `npm run test:integration`.
 *
 * The body rule counts code points, and needs no migration only because
 * `VarChar(280)` counts the same thing. A fake repository stores whatever it is
 * handed, so only the real columns can show they agree with the rule.
 *
 * TAG-scoped: every row carries the tag, and only tagged rows are removed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../database/index.js";

const TAG = `itbody${process.pid}x${Math.floor(process.hrtime()[1])}`;
const AT_LIMIT = "👍".repeat(280);
const PAST_LIMIT = "👍".repeat(281);

let reachable = false;
let authorId = 0;
let tweetId = 0;

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
  tweetId = (await prisma.tweet.create({ data: { body: TAG, authorId }, select: { id: true } })).id;
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.comment.deleteMany({ where: { authorId } });
    await prisma.tweet.deleteMany({ where: { authorId } });
    await prisma.user.deleteMany({ where: { username: TAG } });
  }
  await prisma.$disconnect();
});

describe("a post's body column holds exactly the rule's maximum", () => {
  it("stores 280 characters that each take two UTF-16 units, unchanged", async () => {
    if (!reachable) return;
    const { id } = await prisma.tweet.create({ data: { body: AT_LIMIT, authorId }, select: { id: true } });

    const stored = await prisma.tweet.findUniqueOrThrow({ where: { id }, select: { body: true } });

    expect(stored.body).toBe(AT_LIMIT);
  });

  it("refuses the 281st character on its own, beneath the validator", async () => {
    if (!reachable) return;

    await expect(prisma.tweet.create({ data: { body: PAST_LIMIT, authorId } })).rejects.toMatchObject({ code: "P2000" });
  });
});

describe("a comment's body column holds exactly the rule's maximum", () => {
  it("stores 280 characters that each take two UTF-16 units, unchanged", async () => {
    if (!reachable) return;
    const { id } = await prisma.comment.create({
      data: { body: AT_LIMIT, authorId, tweetId },
      select: { id: true },
    });

    const stored = await prisma.comment.findUniqueOrThrow({ where: { id }, select: { body: true } });

    expect(stored.body).toBe(AT_LIMIT);
  });

  it("refuses the 281st character on its own, beneath the validator", async () => {
    if (!reachable) return;

    await expect(prisma.comment.create({ data: { body: PAST_LIMIT, authorId, tweetId } })).rejects.toMatchObject({ code: "P2000" });
  });
});
