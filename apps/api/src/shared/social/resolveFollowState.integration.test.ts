/**
 * Follow state against a REAL Postgres. Run with `npm run test:integration`.
 *
 * What only the database can answer: that the two-armed `OR` really returns both
 * directions from one statement over a real follow graph, that a page of people
 * costs one query rather than one per person, and that the four surfaces which
 * draw a Follow button agree about the same pair.
 *
 * TAG-scoped: every row carries the tag, and only tagged rows are removed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../database/index.js";
import { resolveFollowState, followStateOf } from "./resolveFollowState.js";
import { createUserService } from "../../modules/users/user.service.js";
import { createFollowService } from "../../modules/follows/follow.service.js";

const TAG = `itfollow${process.pid}x${Math.floor(process.hrtime()[1])}`;
const users = createUserService();
const follows = createFollowService();

let reachable = false;
/** reader, followed-by-reader, follows-reader, mutual, unconnected */
const id: Record<string, number> = {};

const makeUser = async (key: string) => {
  const u = await prisma.user.create({
    data: { username: `${TAG}${key}`, email: `${TAG}${key}@it.local`, passwordHash: "x" },
  });
  id[key] = u.id;
  return u.id;
};

const follow = (followerId: number, followingId: number) =>
  prisma.follow.create({ data: { followerId, followingId } });

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  await makeUser("reader");
  await makeUser("followed");
  await makeUser("follower");
  await makeUser("mutual");
  await makeUser("stranger");

  await follow(id.reader!, id.followed!); // reader → followed
  await follow(id.follower!, id.reader!); // follower → reader
  await follow(id.reader!, id.mutual!); // both ways with mutual
  await follow(id.mutual!, id.reader!);
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.follow.deleteMany({ where: { follower: { username: { startsWith: TAG } } } });
    await prisma.follow.deleteMany({ where: { following: { username: { startsWith: TAG } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } });
  }
  await prisma.$disconnect();
});

describe("both directions, from one statement", () => {
  it("tells the four relations apart across one page", async () => {
    if (!reachable) return;

    const state = await resolveFollowState(id.reader!, [
      id.followed!,
      id.follower!,
      id.mutual!,
      id.stranger!,
    ]);

    expect(followStateOf(state, id.followed!)).toEqual({ isFollowing: true, followsYou: false });
    expect(followStateOf(state, id.follower!)).toEqual({ isFollowing: false, followsYou: true });
    expect(followStateOf(state, id.mutual!)).toEqual({ isFollowing: true, followsYou: true });
    expect(followStateOf(state, id.stranger!)).toEqual({ isFollowing: false, followsYou: false });
  });

  it("reports neither direction on the reader's own row", async () => {
    if (!reachable) return;

    const state = await resolveFollowState(id.reader!, [id.reader!]);

    // Self-follow is refused, so the pair cannot say otherwise — which is what
    // lets the client derive "this is you" from ids alone.
    expect(followStateOf(state, id.reader!)).toEqual({ isFollowing: false, followsYou: false });
  });

  it("costs one statement for a page, not one per person", async () => {
    if (!reachable) return;

    let statements = 0;
    const counting = prisma.$extends({
      query: {
        follow: {
          findMany({ args, query }) {
            statements += 1;
            return query(args);
          },
        },
      },
    }) as never;

    await resolveFollowState(
      id.reader!,
      [id.followed!, id.follower!, id.mutual!, id.stranger!],
      counting,
    );

    expect(statements).toBe(1);
  });
});

describe("the surfaces agree about the same pair", () => {
  it("the profile and the following list report the same relation", async () => {
    if (!reachable) return;

    const profile = await users.getProfile(`${TAG}mutual`, id.reader!);
    const { data } = await follows.getFollowing(`${TAG}reader`, { limit: 20 }, id.reader!);
    const row = data.find((person) => person.id === id.mutual!);

    expect(profile.isFollowing).toBe(true);
    expect(profile.followsYou).toBe(true);
    expect(row).toMatchObject({ isFollowing: true, followsYou: true });
  });

  it("a guest reads neither direction on either surface", async () => {
    if (!reachable) return;

    const profile = await users.getProfile(`${TAG}mutual`);
    const { data } = await follows.getFollowers(`${TAG}reader`, { limit: 20 });

    expect(profile).toMatchObject({ isFollowing: false, followsYou: false });
    expect(data.every((person) => !person.isFollowing && !person.followsYou)).toBe(true);
  });

  it("the follower list reports the reader's own side of each row", async () => {
    if (!reachable) return;

    // The reader's followers: `follower` and `mutual`. The reader follows only
    // one of them back, and the rows must say so individually.
    const { data } = await follows.getFollowers(`${TAG}reader`, { limit: 20 }, id.reader!);

    expect(data.find((p) => p.id === id.follower!)).toMatchObject({
      isFollowing: false,
      followsYou: true,
    });
    expect(data.find((p) => p.id === id.mutual!)).toMatchObject({
      isFollowing: true,
      followsYou: true,
    });
  });
});
