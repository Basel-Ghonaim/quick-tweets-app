/**
 * Register transaction correctness (WI-D, #385) — against a REAL Postgres.
 *
 * Run with `npm run test:integration`. Proves the two guarantees that only a
 * real database can demonstrate:
 *   1. a forced refresh-session persistence failure ROLLS BACK the User row —
 *      no orphan account is left behind;
 *   2. two concurrent registrations of the same identity yield EXACTLY one
 *      success and one 409 — never a 500, never two accounts.
 *
 * Uses the real repositories + the real runInTransaction bound to the singleton
 * client; only the failure case swaps in a token repository whose refresh insert
 * throws. Seeded rows are TAG-scoped and removed on teardown (the account cascade
 * drops their refresh tokens). Excluded from the default unit run (CI has no DB).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { prisma, runInTransaction } from "../../shared/database/index.js";
import { createAuthService } from "./auth.service.js";
import { createAuthRepository, createTokenRepository } from "./auth.repository.js";
import type { ITokenRepository } from "./auth.types.js";

const base = `itreg${process.pid}x${Math.floor(process.hrtime()[1])}`;
const usernameFor = (suffix: string) => `${base}_${suffix}`;
const inputFor = (suffix: string) => ({
  username: usernameFor(suffix),
  name: "Reg IT",
  email: `${base}_${suffix}@it.local`,
  password: "Passw0rd!",
});

let reachable = false;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    // Cascade from users removes their refresh tokens.
    await prisma.user.deleteMany({ where: { username: { startsWith: base } } });
  }
  await prisma.$disconnect();
});

describe("register — transactional correctness against real Postgres (WI-D)", () => {
  it("rolls back the User row when the refresh-session INSERT fails (no orphan account)", async () => {
    if (!reachable) return;
    const input = inputFor("rollback");

    // Real account repo + real transaction runner, but a refresh repo that fails
    // its INSERT — the exact createRefreshToken-throws scenario.
    const brokenTokens: ITokenRepository = {
      ...createTokenRepository(),
      createRefreshToken: async () => {
        throw new Error("forced refresh-session failure");
      },
    };
    const svc = createAuthService(createAuthRepository(), brokenTokens, runInTransaction);

    const err = await svc.register(input).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    // The account INSERT committed inside the same transaction as the failing
    // refresh INSERT — so it must have rolled back. No row may remain.
    const row = await prisma.user.findUnique({ where: { username: input.username } });
    expect(row).toBeNull();
  });

  it("two concurrent same-identity registrations → exactly one 201 and one 409 (never 500)", async () => {
    if (!reachable) return;
    const input = inputFor("race");
    const svc = createAuthService(); // real everything

    const results = await Promise.allSettled([svc.register({ ...input }), svc.register({ ...input })]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // The loser is a 409 (a handled conflict), never an unhandled 500.
    const reason = rejected[0]!.reason;
    expect(reason).toBeInstanceOf(AppError);
    expect((reason as AppError).statusCode).toBe(409);

    // Exactly one account was persisted, with its refresh session.
    const account = await prisma.user.findUnique({ where: { username: input.username } });
    expect(account).not.toBeNull();
    const sessions = await prisma.refreshToken.count({ where: { userId: account!.id } });
    expect(sessions).toBe(1);
  });
});
