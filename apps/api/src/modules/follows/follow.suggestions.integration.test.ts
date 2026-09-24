/**
 * Suggested accounts against a REAL Postgres. Run with `npm run test:integration`.
 *
 * The ranking, the fill, the exclusions and the tie-break are one SQL ordering, so
 * only a real database can prove them. The graph is built so each rule has a case
 * that would visibly break if the rule did.
 *
 * TAG-scoped: every row carries the tag, and only tagged rows are removed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createFollowRepository } from "./follow.repository.js";
import { createFollowService } from "./follow.service.js";

const TAG = `itsug${process.pid}x${Math.floor(process.hrtime()[1])}`;
const repo = createFollowRepository();
const service = createFollowService();

let reachable = false;
// Created in this order, so ids rise with it: E is older than D, and X is the newest.
const ids: Record<"R" | "A" | "B" | "E" | "C" | "D" | "X" | "Z" | "LONER", number> = {
  R: 0, A: 0, B: 0, E: 0, C: 0, D: 0, X: 0, Z: 0, LONER: 0,
};
const nameOf = (id: number) => Object.entries(ids).find(([, v]) => v === id)?.[0] ?? "other";

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  for (const key of Object.keys(ids) as (keyof typeof ids)[]) {
    const user = await prisma.user.create({
      data: { username: `${TAG}${key.toLowerCase()}`, email: `${TAG}${key}@it.local`, passwordHash: "x" },
    });
    ids[key] = user.id;
  }
  const { R, A, B, E, C, D, X, Z } = ids;
  // R follows A and B. What A and B follow is what R is suggested.
  const edges: [number, number][] = [
    [R, A], [R, B],
    [A, B], // B is followed by one of R's follows, but R already follows B.
    [A, R], // R is followed by one of R's follows, but R is the reader.
    [A, C], [B, C], // C: two of R's follows.
    [A, X], [B, X], // X: two, and as many followers as C. X is newer.
    [B, D], // D: one, with one follower.
    [B, E], [Z, E], // E: one, with two followers. E is older than D.
    [C, R], // C follows the reader back, so C's row says so.
  ];
  await prisma.follow.createMany({ data: edges.map(([followerId, followingId]) => ({ followerId, followingId })) });
  // X once went by another handle; a profile address can still carry it.
  await prisma.usernameAlias.create({ data: { username: `${TAG}xold`, userId: X } });
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } });
  }
  await prisma.$disconnect();
});

const suggestedFor = async (readerId: number | undefined, limit: number, excludedId?: number) =>
  (await repo.findSuggestions({ readerId, excludedId, limit })).map((row) => row.id);

describe("a reader's suggestions, ranked by the people their follows follow", () => {
  it("ranks by how many of the reader's follows follow each person", async () => {
    if (!reachable) return;

    expect((await suggestedFor(ids.R, 4)).map(nameOf)).toEqual(["X", "C", "E", "D"]);
  });

  it("breaks an equal rank by followers first: E, older but more followed, comes before D", async () => {
    if (!reachable) return;
    const order = (await suggestedFor(ids.R, 4)).map(nameOf);

    expect(order.indexOf("E")).toBeLessThan(order.indexOf("D"));
  });

  it("then by the newest account: X, as followed as C, comes first", async () => {
    if (!reachable) return;
    const order = (await suggestedFor(ids.R, 4)).map(nameOf);

    expect(order.indexOf("X")).toBeLessThan(order.indexOf("C"));
  });

  it("never suggests the reader, or anyone the reader already follows", async () => {
    if (!reachable) return;
    const suggested = await suggestedFor(ids.R, 20);

    expect(suggested).not.toContain(ids.R);
    expect(suggested).not.toContain(ids.A);
    expect(suggested).not.toContain(ids.B);
  });

  it("leaves out the person being viewed", async () => {
    if (!reachable) return;

    expect((await suggestedFor(ids.R, 3, ids.X)).map(nameOf)).toEqual(["C", "E", "D"]);
  });

  it("returns no more than it is asked for", async () => {
    if (!reachable) return;

    expect(await suggestedFor(ids.R, 2)).toHaveLength(2);
  });
});

/** Followers of each id, as the database counts them. */
const followersOf = async (userIds: number[]) => {
  const counts = await prisma.follow.groupBy({ by: ["followingId"], where: { followingId: { in: userIds } }, _count: true });
  return new Map(counts.map((c) => [c.followingId, c._count]));
};

/** True when the list runs most-followed first, and newest first among equals. */
const isMostFollowedFirst = async (list: number[]) => {
  const followers = await followersOf(list);
  return list.every((id, i) => {
    if (i === 0) return true;
    const [prev, cur] = [followers.get(list[i - 1]) ?? 0, followers.get(id) ?? 0];
    return prev > cur || (prev === cur && list[i - 1] > id);
  });
};

describe("the fill: the most-followed, where the ranked part runs short", () => {
  it("fills a reader who follows nobody, most-followed first, newest first among equals", async () => {
    if (!reachable) return;
    const suggested = await suggestedFor(ids.LONER, 20);

    expect(suggested.length).toBeGreaterThan(0);
    expect(suggested).not.toContain(ids.LONER);
    expect(await isMostFollowedFirst(suggested)).toBe(true);
  });

  it("gives a guest the most-followed, in the same order", async () => {
    if (!reachable) return;
    const suggested = await suggestedFor(undefined, 20);

    expect(suggested.length).toBeGreaterThan(0);
    expect(await isMostFollowedFirst(suggested)).toBe(true);
  });

  it("follows the ranked part for a reader, without repeating anyone", async () => {
    if (!reachable) return;
    const suggested = await suggestedFor(ids.R, 20);

    expect(suggested.slice(0, 4).map(nameOf)).toEqual(["X", "C", "E", "D"]);
    // The graph alone leaves Z and LONER to fill with, so a fill must follow.
    expect(suggested.length).toBeGreaterThan(4);
    expect(new Set(suggested).size).toBe(suggested.length);
    expect(await isMostFollowedFirst(suggested.slice(4))).toBe(true);
  });
});

describe("the service: exclude by handle, and each row's follow state", () => {
  it("leaves out the person being viewed when the address carries their former handle", async () => {
    if (!reachable) return;
    const { data } = await service.getSuggestions(ids.R, { limit: 3, exclude: `${TAG}xold` });

    expect(data.map((item) => nameOf(item.id))).toEqual(["C", "E", "D"]);
  });

  it("tells the reader who follows them back, and never that they follow anyone listed", async () => {
    if (!reachable) return;
    const { data } = await service.getSuggestions(ids.R, { limit: 4 });
    const c = data.find((item) => item.id === ids.C);

    expect(c).toMatchObject({ isFollowing: false, followsYou: true });
    expect(data.every((item) => !item.isFollowing)).toBe(true);
  });

  it("gives a guest the same list with both flags false", async () => {
    if (!reachable) return;
    const { data } = await service.getSuggestions(undefined, { limit: 20 });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((item) => !item.isFollowing && !item.followsYou)).toBe(true);
  });
});
