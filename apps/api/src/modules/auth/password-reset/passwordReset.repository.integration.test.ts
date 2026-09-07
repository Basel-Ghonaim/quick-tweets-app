/**
 * The reset credential repository against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration`. Proves what a fake cannot: that the
 * per-user advisory lock genuinely serialises concurrent requests, and that
 * `markUsed`'s conditional write lets exactly one racing caller win.
 *
 * Self-isolating: every run mints its own users and removes them (and their
 * challenges, which cascade) afterwards.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../shared/database/index.js";
import { createPasswordResetRepository } from "./passwordReset.repository.js";

const TAG = `pwreset-${Date.now().toString(36)}`;
const usernameFor = (name: string) => `${TAG}-${name}`.slice(0, 24);

const repo = createPasswordResetRepository();
const EXPIRES = () => new Date(Date.now() + 10 * 60 * 1000);

/** How many callers contend in each race. Comfortably above what either test needs. */
const RACERS = 12;

const removeThisRun = async () => {
  await prisma.passwordResetSession.deleteMany({ where: { tokenHash: { startsWith: TAG } } });
  await prisma.passwordResetChallenge.deleteMany({
    where: { user: { username: { startsWith: TAG } } },
  });
  await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } });
};

/**
 * Open the connections the races need **before** any race runs. A cold pool
 * makes concurrent callers take their turns and a race pass whether or not
 * the lock exists — observed for the identical reason in mail-delivery's own
 * cap race test.
 */
beforeAll(async () => {
  await Promise.all(Array.from({ length: RACERS }, () => prisma.$queryRaw`SELECT 1`));
});

beforeEach(removeThisRun);
afterAll(removeThisRun);

const makeUser = async (name: string) =>
  prisma.user.create({
    data: {
      username: usernameFor(name),
      email: `${usernameFor(name)}@example.test`,
      passwordHash: "unused-in-this-test",
    },
  });

describe("the per-user advisory lock", () => {
  it("serialises concurrent requests for one user to exactly one winner", async () => {
    const user = await makeUser("race");

    // Simulates the service's future orchestration: lock, read the most
    // recent row, and — since none exists yet — create one. Only the
    // transaction that genuinely holds the lock may safely treat "no prior
    // row" as still true by the time it writes.
    const attempt = () =>
      prisma.$transaction(async (tx) => {
        await repo.lockUser(user.id, tx);
        const existing = await repo.findMostRecentForUser(user.id, tx);
        if (existing !== null) return null;
        return repo.createChallenge(
          { userId: user.id, codeHash: `${Math.random()}`, endpoint: user.email, expiresAt: EXPIRES() },
          tx,
        );
      });

    const results = await Promise.all(Array.from({ length: RACERS }, attempt));

    const created = results.filter((r) => r !== null);
    expect(created).toHaveLength(1);

    const stored = await prisma.passwordResetChallenge.count({ where: { userId: user.id } });
    expect(stored).toBe(1);
  });

  it("lets a second request through once the first transaction has committed", async () => {
    const user = await makeUser("sequential");

    await repo.createChallenge(
      { userId: user.id, codeHash: "first", endpoint: user.email, expiresAt: EXPIRES() },
      undefined,
    );
    await repo.createChallenge(
      { userId: user.id, codeHash: "second", endpoint: user.email, expiresAt: EXPIRES() },
      undefined,
    );

    const stored = await prisma.passwordResetChallenge.count({ where: { userId: user.id } });
    expect(stored).toBe(2);
  });
});

describe("marking a row used under a race", () => {
  it("admits exactly one winner when many callers race to consume the same code", async () => {
    const user = await makeUser("consume");
    const row = await repo.createChallenge(
      { userId: user.id, codeHash: "shared-code", endpoint: user.email, expiresAt: EXPIRES() },
      undefined,
    );

    const results = await Promise.all(
      Array.from({ length: RACERS }, () => repo.markUsed(row.id, new Date())),
    );

    const wins = results.filter((count) => count === 1);
    expect(wins).toHaveLength(1);
    expect(results.filter((count) => count === 0)).toHaveLength(RACERS - 1);
  });
});

describe("the digest lookup", () => {
  it("finds a row by its unique code_hash", async () => {
    const user = await makeUser("lookup");
    await repo.createChallenge(
      { userId: user.id, codeHash: "find-me", endpoint: user.email, expiresAt: EXPIRES() },
      undefined,
    );

    const found = await repo.findByCodeHash("find-me");

    expect(found?.userId).toBe(user.id);
  });
});

/**
 * The bound lives in this conditional write and nowhere above it, so the unit
 * lane — driving a fake that enforces its own copy — cannot see it at all.
 */
describe("recording an ask against a position", () => {
  const makeSession = async (name: string, resendsUsed = 0) =>
    prisma.passwordResetSession.create({
      data: {
        tokenHash: `${TAG}-${name}`,
        maskedEndpoint: "h•••••@example.test",
        resendsUsed,
        expiresAt: EXPIRES(),
      },
    });

  it("stamps the ask, extends the position and increments the count", async () => {
    const session = await makeSession("ask");
    const askedAt = new Date();
    const expiresAt = new Date(askedAt.getTime() + 60_000);

    const count = await repo.recordResend(session.id, askedAt, expiresAt, 3);

    const after = await prisma.passwordResetSession.findUnique({ where: { id: session.id } });
    expect(count).toBe(1);
    expect(after?.resendsUsed).toBe(1);
    expect(after?.lastAskedAt).toEqual(askedAt);
    expect(after?.expiresAt).toEqual(expiresAt);
  });

  it("refuses once the bound is reached, and leaves the position exactly as it stands", async () => {
    const session = await makeSession("spent", 3);
    const before = await prisma.passwordResetSession.findUnique({ where: { id: session.id } });

    const count = await repo.recordResend(session.id, new Date(), EXPIRES(), 3);

    const after = await prisma.passwordResetSession.findUnique({ where: { id: session.id } });
    expect(count).toBe(0);
    expect(after).toEqual(before);
  });

  /* Decided by the write, not by a read above it: simultaneous asks against
     the last remaining one cannot both pass. */
  it("admits exactly one winner when many callers race for the last ask", async () => {
    const session = await makeSession("race", 2);

    const results = await Promise.all(
      Array.from({ length: RACERS }, () => repo.recordResend(session.id, new Date(), EXPIRES(), 3)),
    );

    expect(results.filter((count) => count === 1)).toHaveLength(1);
    expect(results.filter((count) => count === 0)).toHaveLength(RACERS - 1);
  });
});
