/**
 * Auth service — registration and profile-read behaviour.
 *
 * After the auth-first migration (ADR 0008 D1) registration is account creation
 * only: no avatar is adopted at signup, so a new account never carries one and
 * register never spans a Media unit-of-work. The avatar is still *resolved for
 * display* on login/refresh/getMe via Media's resolution port — the only Media
 * surface Auth still uses (the adoption/references ports are retired in WI-6).
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import type { AuthMediaPort } from "./auth.service.js";
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

  return { users, authRepo, tokenRepo, calls };
};

// Only `resolution` is exercised now. `adoption`/`references` are inert ports
// (removed in WI-6); a throwing stub proves registration never touches them.
const makeMedia = (): AuthMediaPort => ({
  adoption: {
    adopt: async () => { throw new Error("registration must not adopt an avatar"); },
  },
  resolution: {
    resolveTokens: async (ids) => new Map(ids.map((id) => [id, `token-${id}` as never])),
    resolveToken: async (id) => `token-${id}` as never,
  },
  references: {
    referenceBegan: async () => { throw new Error("registration must not signal a reference"); },
    referenceEnded: async () => {},
    isReferenced: async () => false,
  },
});

describe("auth service — account-only registration", () => {
  it("registers with account fields only and returns a null avatar token", async () => {
    const w = makeWorld();
    const svc = createAuthService(w.authRepo, w.tokenRepo, makeMedia());

    const result = await svc.register({ ...REG });

    // Account created, session issued, but no avatar is ever attached at signup.
    expect(result.avatarToken).toBeNull();
    expect(w.users).toHaveLength(1);
    expect(w.users[0]!.avatarMediaId).toBeNull();
    expect(w.calls.createRefresh).toEqual([{ userId: w.users[0]!.id }]);
  });

  it("rejects a duplicate username with 409 before creating anything", async () => {
    const w = makeWorld([REG.username]);
    const svc = createAuthService(w.authRepo, w.tokenRepo, makeMedia());

    const err = await svc.register({ ...REG }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
    expect(w.users).toHaveLength(0);
  });

  it("resolves the avatar token on getMe (and null when unset)", async () => {
    const w = makeWorld();
    w.users.push({
      id: 5, username: "u", name: "N", email: "e@x.com", passwordHash: "h",
      profileImage: null, avatarMediaId: 88, bio: "", createdAt: new Date(), updatedAt: new Date(),
    });
    w.users.push({
      id: 6, username: "v", name: "M", email: "f@x.com", passwordHash: "h",
      profileImage: null, avatarMediaId: null, bio: "", createdAt: new Date(), updatedAt: new Date(),
    });
    const svc = createAuthService(w.authRepo, w.tokenRepo, makeMedia());

    expect((await svc.getMe(5)).avatarToken).toBe("token-88");
    expect((await svc.getMe(6)).avatarToken).toBeNull();
  });
});
