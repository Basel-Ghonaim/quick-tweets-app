/**
 * Auth service — register-with-avatar orchestration tests (M6 / ADR 0007).
 *
 * The four approved scenarios plus the pinned transaction guarantee:
 *   - S1 no avatar → normal registration.
 *   - S3 avatar happy path → create + adopt + link share ONE transaction.
 *   - S3 adoption fails → the whole transaction rolls back (no orphan account).
 *   - S4 registration fails for another reason → adoption never runs, the grant
 *     is not spent, and a retry with the same avatar succeeds.
 *
 * A fake `runInTransaction` snapshots the in-memory user store and restores it
 * if the callback throws — so "the user was rolled back" is a real assertion —
 * and passes an opaque sentinel client, so "the same transaction" is provable by
 * identity: create, adopt, and setAvatarReference must all receive that sentinel.
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { MediaAdoptionError } from "../media/index.js";
import type { AdoptMediaInput } from "../media/index.js";
import type { AuthMediaPort } from "./auth.service.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createAuthService } from "./auth.service";
import type { IAuthRepository, ITokenRepository } from "./auth.types";

const TX = { __tx: true } as never; // opaque sentinel for the transaction client
const REG = { username: "alice1", name: "Alice", email: "a@example.com", password: "Passw0rd!" };
const AVATAR = { token: "Nk3v9qYw1kPz-XG27RODaQ", grant: "grant.jwt.value" };

interface StoredUser {
  id: number; username: string; name: string; email: string; passwordHash: string;
  profileImage: string | null; avatarMediaId: number | null;
  bio: string; createdAt: Date; updatedAt: Date;
}

const makeWorld = (existingUsernames: string[] = []) => {
  const users: StoredUser[] = [];
  let nextId = 1;
  const calls = {
    create: [] as unknown[],
    setAvatar: [] as { userId: number; referenceId: number; client: unknown }[],
  };

  const authRepo: IAuthRepository = {
    findByUsername: async (u) =>
      (existingUsernames.includes(u) ? { id: -1 } : users.find((x) => x.username === u) ?? null) as never,
    findByEmail: async (e) => (users.find((x) => x.email === e) ?? null) as never,
    findById: async (id) => (users.find((x) => x.id === id) ?? null) as never,
    create: async (data, client) => {
      calls.create.push(client);
      const u: StoredUser = {
        id: nextId++, username: data.username, name: data.name, email: data.email,
        passwordHash: data.passwordHash, profileImage: null, avatarMediaId: null,
        bio: "", createdAt: new Date(), updatedAt: new Date(),
      };
      users.push(u);
      return u as never;
    },
    setAvatarReference: async (userId, referenceId, client) => {
      calls.setAvatar.push({ userId, referenceId, client });
      const u = users.find((x) => x.id === userId);
      if (u) u.avatarMediaId = referenceId;
    },
  };

  const tokenRepo: ITokenRepository = {
    createRefreshToken: async () => ({}) as never,
    findRefreshToken: async () => null,
    deleteRefreshToken: async () => {},
    deleteAllUserTokens: async () => {},
    rotateRefreshToken: async () => ({}) as never,
  };

  // A transaction runner that actually rolls the store back on failure.
  const runInTransaction: RunInTransaction = async (fn) => {
    const before = users.map((u) => ({ ...u }));
    try {
      return await fn(TX);
    } catch (e) {
      users.splice(0, users.length, ...before);
      throw e;
    }
  };

  return { users, authRepo, tokenRepo, calls, runInTransaction };
};

const makeMedia = (
  adopt: (input: AdoptMediaInput) => Promise<{ referenceId: number; token: string }>,
) => {
  const calls: { input: AdoptMediaInput; client: unknown }[] = [];
  const signals: { mediaId: number; referrer: string; client: unknown }[] = [];
  const media: AuthMediaPort = {
    adoption: {
      adopt: async (input, client) => {
        calls.push({ input, client });
        const r = await adopt(input);
        return { referenceId: r.referenceId, token: r.token as never };
      },
    },
    resolution: {
      resolveTokens: async (ids) => new Map(ids.map((id) => [id, `token-${id}` as never])),
      resolveToken: async (id) => `token-${id}` as never,
    },
    references: {
      referenceBegan: async ({ mediaId, referrer }, client) => {
        signals.push({ mediaId, referrer, client });
      },
      referenceEnded: async () => {},
      isReferenced: async () => false,
    },
  };
  return { media, calls, signals };
};

describe("auth register-with-avatar", () => {
  it("S1: registers without an avatar (avatar is optional)", async () => {
    const w = makeWorld();
    const { media, calls } = makeMedia(async () => { throw new Error("must not adopt"); });
    const svc = createAuthService(w.authRepo, w.tokenRepo, media, w.runInTransaction);

    const result = await svc.register({ ...REG });

    expect(result.avatarToken).toBeNull();
    expect(w.users).toHaveLength(1);
    expect(calls).toHaveLength(0);
  });

  it("S3: create + adopt + link all run inside ONE shared transaction", async () => {
    const w = makeWorld();
    const { media, calls } = makeMedia(async (input) => ({ referenceId: 42, token: `tok-${input.ownerId}` }));
    const svc = createAuthService(w.authRepo, w.tokenRepo, media, w.runInTransaction);

    const result = await svc.register({ ...REG, avatar: { ...AVATAR } });

    // Linked and reported.
    expect(w.users).toHaveLength(1);
    const created = w.users[0]!;
    expect(created.avatarMediaId).toBe(42);
    expect(result.avatarToken).toBe(`tok-${created.id}`);
    // adopt received the just-created user's id → create ran first, inside the tx.
    expect(calls[0]!.input).toMatchObject({ token: AVATAR.token, grant: AVATAR.grant, ownerId: created.id });
    // The single-transaction proof: all three writes got the SAME sentinel client.
    expect(w.calls.create[0]).toBe(TX);
    expect(calls[0]!.client).toBe(TX);
    expect(w.calls.setAvatar[0]!.client).toBe(TX);
    expect(w.calls.setAvatar[0]!.referenceId).toBe(42);
  });

  it("S3: the avatar reference is signalled to Media, inside the same transaction", async () => {
    // Without this signal the object looks unreferenced and reclamation would
    // eventually destroy a live avatar.
    const w = makeWorld();
    const { media, signals } = makeMedia(async () => ({ referenceId: 42, token: "tok" }));
    const svc = createAuthService(w.authRepo, w.tokenRepo, media, w.runInTransaction);

    await svc.register({ ...REG, avatar: { ...AVATAR } });

    const created = w.users[0]!;
    expect(signals).toEqual([
      { mediaId: 42, referrer: `user-avatar:${created.id}`, client: TX },
    ]);
  });

  it("S1: no avatar means no reference signal", async () => {
    const w = makeWorld();
    const { media, signals } = makeMedia(async () => { throw new Error("must not adopt"); });
    const svc = createAuthService(w.authRepo, w.tokenRepo, media, w.runInTransaction);

    await svc.register({ ...REG });

    expect(signals).toHaveLength(0);
  });

  it("S3: a failed conditional adoption rolls the whole transaction back (no orphan account)", async () => {
    const w = makeWorld();
    const { media } = makeMedia(async () => { throw MediaAdoptionError.invalidEvidence(); });
    const svc = createAuthService(w.authRepo, w.tokenRepo, media, w.runInTransaction);

    const err = await svc.register({ ...REG, avatar: { ...AVATAR } }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(422); // fail-loud
    expect(w.users).toHaveLength(0); // the created user was rolled back
  });

  it("S3: an already-adopted avatar maps to 409 and still rolls back", async () => {
    const w = makeWorld();
    const { media } = makeMedia(async () => { throw MediaAdoptionError.alreadyAdopted(); });
    const svc = createAuthService(w.authRepo, w.tokenRepo, media, w.runInTransaction);

    const err = await svc.register({ ...REG, avatar: { ...AVATAR } }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(409);
    expect(w.users).toHaveLength(0);
  });

  it("S4: a username conflict never touches the object; a retry with the same avatar succeeds", async () => {
    // Attempt 1 — username taken → 409 before the transaction; adoption never runs.
    const taken = makeWorld([REG.username]);
    const m1 = makeMedia(async () => { throw new Error("adopt must not run on a register conflict"); });
    const svc1 = createAuthService(taken.authRepo, taken.tokenRepo, m1.media, taken.runInTransaction);

    const err = await svc1.register({ ...REG, avatar: { ...AVATAR } }).catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(409);
    expect(m1.calls).toHaveLength(0); // grant unspent, object untouched
    expect(taken.users).toHaveLength(0);

    // Attempt 2 — same avatar token + grant, different username → adoption proceeds.
    const w = makeWorld();
    const m2 = makeMedia(async () => ({ referenceId: 7, token: "tok" }));
    const svc2 = createAuthService(w.authRepo, w.tokenRepo, m2.media, w.runInTransaction);

    const ok = await svc2.register({ ...REG, username: "alice2", avatar: { ...AVATAR } });
    expect(ok.avatarToken).toBe("tok");
    expect(m2.calls).toHaveLength(1);
    expect(m2.calls[0]!.input).toMatchObject({ token: AVATAR.token, grant: AVATAR.grant });
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
    const { media } = makeMedia(async () => { throw new Error("no adopt"); });
    const svc = createAuthService(w.authRepo, w.tokenRepo, media, w.runInTransaction);

    expect((await svc.getMe(5)).avatarToken).toBe("token-88");
    expect((await svc.getMe(6)).avatarToken).toBeNull();
  });
});
