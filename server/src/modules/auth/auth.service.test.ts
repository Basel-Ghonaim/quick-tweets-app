/**
 * Auth service — registration and identity behaviour (Media-free).
 *
 * After the auth-first migration Auth is Media-free and Profile-free (ADR 0008
 * D10): registration is account creation only, and no auth operation resolves or
 * returns an avatar — the current-user avatar is served by `GET /users/me`.
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createAuthService } from "./auth.service";
import type { IAuthRepository, ITokenRepository } from "./auth.types";

const REG = { username: "alice1", name: "Alice", email: "a@example.com", password: "Passw0rd!" };

interface StoredUser {
  id: number; username: string; name: string; email: string; passwordHash: string;
  profileImage: string | null; avatarMediaId: number | null;
  bio: string; createdAt: Date; updatedAt: Date;
}

const makeWorld = (existingUsernames: string[] = []) => {
  const users: StoredUser[] = [];
  let nextId = 1;
  const calls = { createRefresh: [] as { userId: number }[] };

  const authRepo: IAuthRepository = {
    findByUsername: async (u) =>
      (existingUsernames.includes(u) ? { id: -1 } : users.find((x) => x.username === u) ?? null) as never,
    findByEmail: async (e) => (users.find((x) => x.email === e) ?? null) as never,
    findById: async (id) => (users.find((x) => x.id === id) ?? null) as never,
    create: async (data) => {
      const u: StoredUser = {
        id: nextId++, username: data.username, name: data.name, email: data.email,
        passwordHash: data.passwordHash, profileImage: null, avatarMediaId: null,
        bio: "", createdAt: new Date(), updatedAt: new Date(),
      };
      users.push(u);
      return u as never;
    },
  };

  const tokenRepo: ITokenRepository = {
    createRefreshToken: async (userId) => { calls.createRefresh.push({ userId }); return {} as never; },
    findRefreshToken: async () => null,
    deleteRefreshToken: async () => {},
    deleteAllUserTokens: async () => {},
    rotateRefreshToken: async () => ({}) as never,
    deleteExpired: async () => 0,
  };

  // Passthrough runner: register now commits inside runInTransaction; the fake
  // repos already write in-memory, so the tx boundary is a no-op here (atomic
  // rollback is proven against real Postgres in the integration suite).
  const runInTransaction: RunInTransaction = (fn) => fn({} as never);

  return { users, authRepo, tokenRepo, calls, runInTransaction };
};

describe("auth service — account-only registration (Media-free)", () => {
  it("registers with account fields only and issues a session, with no avatar in the result", async () => {
    const w = makeWorld();
    const svc = createAuthService(w.authRepo, w.tokenRepo, w.runInTransaction);

    const result = await svc.register({ ...REG });

    expect(result.user.username).toBe(REG.username);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(w.users).toHaveLength(1);
    expect(w.users[0]!.avatarMediaId).toBeNull();
    expect(w.calls.createRefresh).toEqual([{ userId: w.users[0]!.id }]);
    // Auth is Media-free — the result carries no avatar.
    expect("avatarToken" in result).toBe(false);
    expect("avatar" in result).toBe(false);
  });

  it("rejects a duplicate username with 409 before creating anything", async () => {
    const w = makeWorld([REG.username]);
    const svc = createAuthService(w.authRepo, w.tokenRepo, w.runInTransaction);

    const err = await svc.register({ ...REG }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
    expect(w.users).toHaveLength(0);
  });

});
