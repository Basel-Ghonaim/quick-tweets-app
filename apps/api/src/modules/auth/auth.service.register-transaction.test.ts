/**
 * Register transaction correctness (WI-D, #385) — unit level.
 *
 * These prove the *control flow* of the transactional register with fakes: that
 * both writes run on one transaction client, that a failed refresh-session write
 * discards the account (no orphan), and that a P2002 racing past the advisory
 * pre-checks is attributed to the right field as a 409 — never a 500. The real
 * atomic rollback and the real concurrent race are proven against Postgres in
 * `auth.service.register.integration.test.ts`.
 *
 * The fake `runInTransaction` here models the commit boundary faithfully: writes
 * land in a staging buffer and are merged into the committed store only if the
 * callback resolves; a throw discards them. So "no account persisted" is a real
 * assertion about rollback, not an artifact of the fake.
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import type { DbClient, RunInTransaction } from "../../shared/database/index.js";
import { createAuthService } from "./auth.service";
import type { IAuthRepository, ITokenRepository } from "./auth.types";

const REG = { username: "racer1", name: "Racer", email: "racer@example.com", password: "Passw0rd!" };

interface HarnessOpts {
  /** createRefreshToken throws (an app-level refresh-session failure). */
  failRefresh?: boolean;
  /** authRepo.create throws P2002 (a duplicate raced past the pre-checks). */
  createThrowsP2002?: boolean;
  /** Which field the racing row occupies, so re-query attribution can find it. */
  raceField?: "username" | "email" | null;
}

const makeHarness = (opts: HarnessOpts = {}) => {
  const committed: { id: number; username: string; email: string }[] = [];
  let staged: typeof committed | null = null;
  let nextId = 1;
  let raced = false; // becomes true once a P2002-throwing create has "lost" the race
  const txClient = { __tx: true } as unknown as DbClient; // identity sentinel
  const seen = { createClients: [] as unknown[], refreshClients: [] as unknown[] };

  const authRepo: IAuthRepository = {
    findByUsername: async (u) =>
      (raced && opts.raceField === "username"
        ? { id: -1 }
        : committed.find((r) => r.username === u) ?? null) as never,
    findByEmail: async (e) =>
      (raced && opts.raceField === "email"
        ? { id: -1 }
        : committed.find((r) => r.email === e) ?? null) as never,
    findById: async () => null as never,
    create: async (data, client) => {
      seen.createClients.push(client);
      if (opts.createThrowsP2002) {
        raced = true;
        const err = new Error("Unique constraint failed") as Error & { code?: string };
        err.code = "P2002";
        throw err;
      }
      const row = { id: nextId++, username: data.username, email: data.email };
      (staged ?? committed).push(row);
      return { ...row, name: null, passwordHash: data.passwordHash } as never;
    },
    updatePasswordHash: async () => {},
  };

  const tokenRepo: ITokenRepository = {
    createRefreshToken: async (_userId, _token, _expiresAt, client) => {
      seen.refreshClients.push(client);
      if (opts.failRefresh) throw new Error("refresh-session INSERT failed");
      return {} as never;
    },
    findRefreshToken: async () => null,
    deleteRefreshToken: async () => {},
    deleteAllUserTokens: async () => {},
    rotateRefreshToken: async () => ({}) as never,
    deleteExpired: async () => 0,
  };

  // Staging buffer merged into `committed` only on success; discarded on throw.
  const runInTransaction: RunInTransaction = async (fn) => {
    staged = [];
    try {
      const result = await fn(txClient);
      committed.push(...staged);
      return result;
    } finally {
      staged = null;
    }
  };

  // The pre-check resolver passes (null) so register proceeds to the INSERT and
  // the P2002 path under test; the DB constraints remain authoritative.
  const svc = createAuthService(authRepo, tokenRepo, runInTransaction, async () => null);
  return { svc, committed, seen, txClient };
};

describe("register — transactional correctness (WI-D)", () => {
  it("commits the account and its session on ONE transaction client", async () => {
    const h = makeHarness();

    const result = await h.svc.register({ ...REG });

    expect(result.accessToken).toBeTruthy();
    expect(h.committed).toHaveLength(1);
    // Both writes ran, and both received the same tx client — one atomic unit.
    expect(h.seen.createClients).toEqual([h.txClient]);
    expect(h.seen.refreshClients).toEqual([h.txClient]);
  });

  it("rolls the account back when the refresh-session write fails (no orphan)", async () => {
    const h = makeHarness({ failRefresh: true });

    const err = await h.svc.register({ ...REG }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect(h.committed).toHaveLength(0); // the account INSERT was discarded with the tx
  });

  it("attributes a racing duplicate USERNAME (P2002) to a 409, never a 500", async () => {
    const h = makeHarness({ createThrowsP2002: true, raceField: "username" });

    const err = await h.svc.register({ ...REG }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
    expect((err as AppError).message).toBe("Username already taken");
    expect(h.committed).toHaveLength(0);
  });

  it("attributes a racing duplicate EMAIL (P2002) to a 409", async () => {
    const h = makeHarness({ createThrowsP2002: true, raceField: "email" });

    const err = await h.svc.register({ ...REG }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(409);
    expect((err as AppError).message).toBe("Email already in use");
  });

  it("falls back to a combined 409 when the racing row is gone by re-query time", async () => {
    const h = makeHarness({ createThrowsP2002: true, raceField: null });

    const err = await h.svc.register({ ...REG }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(409);
    expect((err as AppError).message).toBe("Username or email is already in use");
  });
});
