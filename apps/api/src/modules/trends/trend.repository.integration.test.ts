/**
 * The trending ranking against a REAL Postgres. Run with `npm run test:integration`.
 *
 * The ranking is global, so each case reads a window set years in the past, which no other
 * data shares. Rows are seeded directly: which hashtags a post carries is proved elsewhere.
 *
 * TAG-scoped: every row belongs to the tagged author, and only those rows are removed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createTrendRepository } from "./trend.repository.js";

const TAG = `ittrend${process.pid}x${Math.floor(process.hrtime()[1])}`;
const repo = createTrendRepository();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
// A moment years back, different on each run, so two runs never share a window.
const T0 = Date.UTC(2001, 0, 1) + ((process.pid * 7919 + process.hrtime()[1]) % 3000) * DAY;
const at = (base: number, offset: number) => new Date(base + offset);

let reachable = false;
let authorId = 0;

/** Seeds posts in the order written, so a later post always has the higher id, as in use. */
const seed = async (posts: [Date, string[]][]) => {
  const sorted = [...posts].sort(([a], [b]) => a.getTime() - b.getTime());
  for (const [createdAt, spellings] of sorted) {
    await prisma.tweet.create({
      data: {
        authorId,
        body: TAG,
        createdAt,
        hashtags: { createMany: { data: spellings.map((spelling) => ({ key: spelling.toLowerCase(), spelling })) } },
      },
    });
  }
};

/** The ranking for the week ending at `end`, as tag and count. */
const rank = async (end: number, limit = 20) =>
  (await repo.findTrending({ since: at(end, -WEEK), until: at(end, 0), minPosts: 2, limit })).map(
    (row) => [row.spelling, row.tweetsCount] as const,
  );
const countOf = async (end: number, spelling: string) =>
  (await rank(end)).find(([s]) => s.toLowerCase() === spelling.toLowerCase())?.[1];

// The windows: the main week, and three more set far enough apart not to overlap.
const MAIN = T0;
const CAPPED = T0 + 30 * DAY;
const NONE = T0 + 60 * DAY;
const SAME = T0 + 90 * DAY;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({ data: { username: TAG, email: `${TAG}@it.local`, passwordHash: "x" } });
  authorId = user.id;

  await seed([
    [at(MAIN, -WEEK - 60_000), ["Eta"]], // a minute before the window opens
    [at(MAIN, -WEEK), ["Zeta"]], // the moment it opens
    [at(MAIN, -6 * DAY), ["Alpha"]],
    [at(MAIN, -5 * DAY), ["alpha"]],
    [at(MAIN, -4 * DAY), ["Alpha"]],
    [at(MAIN, -3 * DAY), ["Beta"]],
    [at(MAIN, -2 * DAY), ["BETA"]],
    [at(MAIN, -36 * HOUR), ["zeta"]],
    [at(MAIN, -DAY), ["gamma"]],
    [at(MAIN, -12 * HOUR), ["eta"]],
    [at(MAIN, -10 * HOUR), ["ETA"]],
    [at(MAIN, -3 * HOUR), ["Delta"]],
    [at(MAIN, -HOUR), ["Gamma"]],
    [at(MAIN, HOUR), ["ALPHA"]], // an hour after it closes
  ]);
  // Seven hashtags with two posts each: more than the list may hold.
  const seven = ["k1", "k2", "k3", "k4", "k5", "k6", "k7"];
  await seed([
    [at(CAPPED, -2 * DAY), seven],
    [at(CAPPED, -DAY), seven],
  ]);
  // Every hashtag here has one post only.
  await seed([
    [at(NONE, -2 * DAY), ["solo", "single"]],
    [at(NONE, -DAY), ["alone"]],
  ]);
  // Two hashtags in the same two posts: as many posts, and as recent.
  await seed([
    [at(SAME, -2 * DAY), ["kb", "ka"]],
    [at(SAME, -DAY), ["kb", "ka"]],
  ]);
}, 60_000);

afterAll(async () => {
  if (reachable) {
    await prisma.tweet.deleteMany({ where: { authorId } });
    await prisma.user.deleteMany({ where: { username: TAG } });
  }
  await prisma.$disconnect();
});

describe("what is counted", () => {
  it("counts the posts written within the window, and none after it closes", async () => {
    if (!reachable) return;

    expect(await countOf(MAIN, "alpha")).toBe(3);
  });

  it("counts a post written the moment the window opens", async () => {
    if (!reachable) return;

    expect(await countOf(MAIN, "zeta")).toBe(2);
  });

  it("does not count a post written before it opens", async () => {
    if (!reachable) return;

    expect(await countOf(MAIN, "eta")).toBe(2);
  });
});

describe("what trends", () => {
  it("leaves out a hashtag only one post used", async () => {
    if (!reachable) return;

    expect(await countOf(MAIN, "delta")).toBeUndefined();
  });

  it("is an empty list when no hashtag has two posts", async () => {
    if (!reachable) return;

    expect(await rank(NONE)).toEqual([]);
  });

  it("holds no more than it is asked for", async () => {
    if (!reachable) return;
    const list = await rank(CAPPED, 5);

    expect(list).toHaveLength(5);
    expect(list.every(([, count]) => count === 2)).toBe(true);
  });
});

describe("the order, the same on every request", () => {
  it("puts the most-used hashtag first", async () => {
    if (!reachable) return;

    expect((await rank(MAIN))[0]).toEqual(["Alpha", 3]);
  });

  it("puts the most recently used first among hashtags with as many posts", async () => {
    if (!reachable) return;
    const twos = (await rank(MAIN)).filter(([, count]) => count === 2).map(([s]) => s.toLowerCase());

    expect(twos).toEqual(["gamma", "eta", "zeta", "beta"]);
  });

  it("orders by the characters of the key where posts and recency are equal", async () => {
    if (!reachable) return;

    expect(await rank(SAME)).toEqual([
      ["ka", 2],
      ["kb", 2],
    ]);
  });
});

describe("the spelling shown", () => {
  it("is the one the most posts used", async () => {
    if (!reachable) return;

    expect((await rank(MAIN)).map(([s]) => s)).toContain("Alpha");
  });

  it("is the more recent where two were used as often", async () => {
    if (!reachable) return;
    const shown = (await rank(MAIN)).map(([s]) => s);

    // Not zeta: its first post sits on the window's edge, which is another case's subject.
    expect(shown).toEqual(expect.arrayContaining(["BETA", "Gamma", "ETA"]));
  });
});
