/**
 * Login by neutral identifier — resolver routing, unit level.
 *
 * Proves the resolver contract with fakes: `trim().toLowerCase()` normalization,
 * the `@` discriminator (email vs username), NO fallback between the two paths,
 * and the single generic 401 for every miss. Mixed-case username and email both
 * normalize and resolve. Real end-to-end login is proven against Postgres in
 * auth.service.login.integration.test.ts.
 */

import bcrypt from "bcrypt";
import { beforeAll, describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createAuthService } from "./auth.service";
import type { IAuthRepository, ITokenRepository } from "./auth.types";

const PASSWORD = "Passw0rd!";
let hash = "";
beforeAll(async () => {
  hash = await bcrypt.hash(PASSWORD, 4); // low rounds — unit speed only
});

// One seeded user: username "basel_a", email "basel@example.com".
const makeSvc = () => {
  const user = {
    id: 1, username: "basel_a", name: "Basel", email: "basel@example.com",
    passwordHash: hash, profileImage: null, avatarMediaId: null,
    bio: "", createdAt: new Date(), updatedAt: new Date(),
  };
  const calls = { byUsername: [] as string[], byEmail: [] as string[] };

  const authRepo: IAuthRepository = {
    findByUsername: async (u) => { calls.byUsername.push(u); return (u === user.username ? user : null) as never; },
    findByEmail: async (e) => { calls.byEmail.push(e); return (e === user.email ? user : null) as never; },
    findById: async () => null as never,
    create: async () => user as never,
  };
  const tokenRepo: ITokenRepository = {
    createRefreshToken: async () => ({}) as never,
    findRefreshToken: async () => null,
    deleteRefreshToken: async () => {},
    deleteAllUserTokens: async () => {},
    rotateRefreshToken: async () => ({}) as never,
    deleteExpired: async () => 0,
  };
  const runInTransaction: RunInTransaction = (fn) => fn({} as never);

  return { svc: createAuthService(authRepo, tokenRepo, runInTransaction), calls };
};

describe("login resolver — neutral identifier", () => {
  it("resolves an exact lowercase username — username path only, no email lookup", async () => {
    const { svc, calls } = makeSvc();
    const r = await svc.login({ identifier: "basel_a", password: PASSWORD });
    expect(r.user.id).toBe(1);
    expect(r.accessToken).toBeTruthy();
    expect(calls.byUsername).toEqual(["basel_a"]);
    expect(calls.byEmail).toEqual([]); // no fallback
  });

  it("normalizes a MIXED-CASE username and resolves it", async () => {
    const { svc, calls } = makeSvc();
    const r = await svc.login({ identifier: "  Basel_A  ", password: PASSWORD });
    expect(r.user.id).toBe(1);
    expect(calls.byUsername).toEqual(["basel_a"]); // trimmed + lowercased
    expect(calls.byEmail).toEqual([]);
  });

  it("resolves an exact email — email path only, no username lookup", async () => {
    const { svc, calls } = makeSvc();
    const r = await svc.login({ identifier: "basel@example.com", password: PASSWORD });
    expect(r.user.id).toBe(1);
    expect(calls.byEmail).toEqual(["basel@example.com"]);
    expect(calls.byUsername).toEqual([]); // no fallback
  });

  it("normalizes a MIXED-CASE email and resolves it", async () => {
    const { svc, calls } = makeSvc();
    const r = await svc.login({ identifier: "Basel@Example.COM", password: PASSWORD });
    expect(r.user.id).toBe(1);
    expect(calls.byEmail).toEqual(["basel@example.com"]);
  });

  it("returns a generic 401 for an unknown email — and does NOT fall back to username", async () => {
    const { svc, calls } = makeSvc();
    const err = await svc.login({ identifier: "ghost@example.com", password: PASSWORD }).catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(401);
    expect(calls.byEmail).toEqual(["ghost@example.com"]);
    expect(calls.byUsername).toEqual([]); // no fallback to the username path
  });

  it("returns a generic 401 for an unknown username — and does NOT fall back to email", async () => {
    const { svc, calls } = makeSvc();
    const err = await svc.login({ identifier: "ghost", password: PASSWORD }).catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(401);
    expect(calls.byUsername).toEqual(["ghost"]);
    expect(calls.byEmail).toEqual([]); // no fallback to the email path
  });

  it("returns the same generic 401 for a wrong password", async () => {
    const { svc } = makeSvc();
    const err = await svc.login({ identifier: "basel_a", password: "WrongPass1!" }).catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(401);
    expect((err as AppError).message).toBe("Invalid credentials");
  });
});
