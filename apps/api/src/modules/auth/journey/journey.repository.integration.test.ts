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
        repo.settleProfile(journey.id, new Date(), "saved"),
      ),
    );

    // One writer, and the rest are told they were not it — which is what makes
    // a re-read the truthful answer rather than an optimistic guess.
    expect(wins.filter(Boolean)).toHaveLength(1);
  });

  /* The mark and the outcome are one write, so no race can leave a settled
     step without one — the invariant the database also holds itself to. */
  it("writes the outcome with the mark, never after it", async () => {
    const userId = await makeUser("outcome");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    await Promise.all(
      Array.from({ length: RACERS }, () =>
        repo.settleProfile(journey.id, new Date(), "skipped"),
      ),
    );

    const row = await prisma.onboardingJourney.findUnique({ where: { userId } });
    expect(row!.profileSettledAt).not.toBeNull();
    expect(row!.profileOutcome).toBe("skipped");
  });

  it("refuses a settled step that carries no outcome", async () => {
    const userId = await makeUser("outcomeless");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    await expect(
      prisma.onboardingJourney.update({
        where: { id: journey.id },
        data: { profileSettledAt: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("refuses an outcome outside the two the journey knows", async () => {
    const userId = await makeUser("badoutcome");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    await expect(
      prisma.onboardingJourney.update({
        where: { id: journey.id },
        data: { profileSettledAt: new Date(), profileOutcome: "abandoned" },
      }),
    ).rejects.toThrow();
  });

  it("never moves a mark once set", async () => {
    const userId = await makeUser("frozen");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    const first = new Date("2026-09-05T10:00:00.000Z");
    const later = new Date("2026-09-05T11:00:00.000Z");

    await repo.reachCode(journey.id, first);
    const second = await repo.reachCode(journey.id, later);

    expect(second).toBe(false);
    expect((await repo.findByUserId(userId))!.codeReachedAt).toEqual(first);
  });

  it("closes once, recording the step the reader left", async () => {
    const userId = await makeUser("closed");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    const closes = await Promise.all(
      Array.from({ length: RACERS }, () => repo.close(journey.id, new Date(), "code", "later")),
    );

    expect(closes.filter(Boolean)).toHaveLength(1);

    const row = await prisma.onboardingJourney.findUnique({ where: { userId } });
    expect(row!.closedAt).not.toBeNull();
    expect(row!.closedReason).toBe("code");
  });

  /* Both facts about the end are written with the mark, so a closed journey can
     never carry one and lack the other. */
  it("writes how the verification step ended, with the close", async () => {
    const userId = await makeUser("ended");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    await repo.close(journey.id, new Date(), "code", "verified");

    const row = await prisma.onboardingJourney.findUnique({ where: { userId } });
    expect(row!.verificationOutcome).toBe("verified");
  });

  it("refuses a close that records no outcome", async () => {
    const userId = await makeUser("endless");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    await expect(
      prisma.onboardingJourney.update({
        where: { id: journey.id },
        data: { closedAt: new Date(), closedReason: "verify" },
      }),
    ).rejects.toThrow();
  });

  it("refuses an outcome outside the two the journey knows", async () => {
    const userId = await makeUser("endbad");
    await repo.create(userId);
    const journey = (await repo.findByUserId(userId))!;

    await expect(
      prisma.onboardingJourney.update({
        where: { id: journey.id },
        data: { closedAt: new Date(), verificationOutcome: "abandoned" },
      }),
    ).rejects.toThrow();
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
