/**
 * The journey repository against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration`. Proves the two guarantees a fake cannot:
 * that the database itself refuses a second journey for one account, and that
 * the conditional writes let exactly one racing caller win — which is what the
 * capability relies on instead of a lock.
 *
 * Self-isolating: every run mints its own users and removes them (their
 * journeys cascade) afterwards.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../shared/database/index.js";
import { createJourneyRepository } from "./journey.repository.js";

const TAG = `journey-${Date.now().toString(36)}`;
const usernameFor = (name: string) => `${TAG}-${name}`.slice(0, 24);

const repo = createJourneyRepository();

/** How many callers contend in each race. */
const RACERS = 12;

const removeThisRun = async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } });
};

const makeUser = async (name: string) => {
  const username = usernameFor(name);
  const user = await prisma.user.create({
    data: { username, email: `${username}@example.test`, passwordHash: "x" },
  });
  return user.id;
};

/* A cold pool makes concurrent callers take their turns, which would let a race
   pass whether or not the guarantee under test exists. */
beforeAll(async () => {
  await Promise.all(Array.from({ length: RACERS }, () => prisma.$queryRaw`SELECT 1`));
});

beforeEach(removeThisRun);
afterAll(removeThisRun);

describe("a journey is one per account, enforced by the database", () => {
  it("refuses a second journey for the same account", async () => {
    const userId = await makeUser("once");
    await repo.create(userId);

    await expect(repo.create(userId)).rejects.toThrow();

    const count = await prisma.onboardingJourney.count({ where: { userId } });
    expect(count).toBe(1);
  });

  it("survives concurrent creation with exactly one row", async () => {
    const userId = await makeUser("race");

    const results = await Promise.allSettled(
      Array.from({ length: RACERS }, () => repo.create(userId)),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const count = await prisma.onboardingJourney.count({ where: { userId } });
    expect(count).toBe(1);
  });
});

describe("a mark is filled once, whoever gets there first", () => {
  it("lets exactly one racing caller write it", async () => {
    const userId = await makeUser("mark");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    const wins = await Promise.all(
      Array.from({ length: RACERS }, () =>
        repo.fillMark(journey.id, "profileSettledAt", new Date()),
      ),
    );

    // One writer, and the rest are told they were not it — which is what makes
    // a re-read the truthful answer rather than an optimistic guess.
    expect(wins.filter(Boolean)).toHaveLength(1);
  });

  it("never moves a mark once set", async () => {
    const userId = await makeUser("frozen");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    const first = new Date("2026-09-05T10:00:00.000Z");
    const later = new Date("2026-09-05T11:00:00.000Z");

    await repo.fillMark(journey.id, "codeReachedAt", first);
    const second = await repo.fillMark(journey.id, "codeReachedAt", later);

    expect(second).toBe(false);
    expect((await repo.findByUserId(userId))!.codeReachedAt).toEqual(first);
  });

  it("closes once, recording the step the reader left", async () => {
    const userId = await makeUser("closed");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    const closes = await Promise.all(
      Array.from({ length: RACERS }, () => repo.close(journey.id, new Date(), "code")),
    );

    expect(closes.filter(Boolean)).toHaveLength(1);

    const row = await prisma.onboardingJourney.findUnique({ where: { userId } });
    expect(row!.closedAt).not.toBeNull();
    expect(row!.closedReason).toBe("code");
  });
});

describe("a journey outlives the reader's session", () => {
  it("is found by account, with no credential involved", async () => {
    const userId = await makeUser("byaccount");
    await repo.create(userId);

    // Nothing but the account id is needed to find it: the journey is a fact
    // about the account, so clearing cookies cannot lose it.
    await expect(repo.findByUserId(userId)).resolves.toMatchObject({ userId });
  });

  it("is absent for an account that never registered through it", async () => {
    const userId = await makeUser("never");

    await expect(repo.findByUserId(userId)).resolves.toBeNull();
  });
});
