/**
 * User avatar/profile — attach, coordination, policy, and the transaction
 * guarantee (WI-2 / ADR 0008).
 *
 * A fake `runInTransaction` passes an opaque sentinel client, so "one shared
 * transaction" is provable by identity: the avatar reference signal and the User
 * update must both receive that sentinel. It restores the store on throw, so
 * "it rolled back" is a real assertion. The avatar *policy* is the real one.
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { MediaAttachError } from "../media/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createUserService, type UserMediaPort } from "./user.service.js";
import type { IUserRepository, UserWithCounts } from "./user.types.js";

const TX = { __tx: true } as never; // opaque sentinel for the transaction client
const USER = 7;

const rawUser = (over: Partial<UserWithCounts> = {}): UserWithCounts => ({
  id: USER,
  username: "ada",
  name: "Ada",
  email: "ada@example.com",
  profileImage: null,
  avatarMediaId: null,
  bio: "",
  createdAt: new Date(),
  _count: { tweets: 0, followers: 0, following: 0 },
  ...over,
});

const makeWorld = (currentAvatar: number | null = null) => {
  const updates: { data: { name?: string; bio?: string; avatarMediaId?: number | null }; client: unknown }[] = [];
  let stored: number | null = currentAvatar;

  const repo: IUserRepository = {
    findByUsernameWithCounts: async () => rawUser({ avatarMediaId: stored }),
    findByIdWithCounts: async () => rawUser({ avatarMediaId: stored }),
    isFollowing: async () => false,
    countLikesReceived: async () => 0,
    findAvatar: async () => ({ avatarMediaId: stored }),
    updateProfile: async (_userId, data, client) => {
      updates.push({ data, client });
      if (data.avatarMediaId !== undefined) stored = data.avatarMediaId;
      return rawUser({ name: data.name ?? "Ada", bio: data.bio ?? "", avatarMediaId: stored });
    },
  } as IUserRepository;

  const runInTransaction: RunInTransaction = async (fn) => {
    const before = stored;
    try {
      return await fn(TX);
    } catch (e) {
      stored = before;
      throw e;
    }
  };

  return { repo, updates, runInTransaction, avatar: () => stored };
};

/** A media port authorizing tokens by a fixed token→{ref, metadata} map. */
const makeMedia = (refs: Record<string, { id: number; contentType?: string; size?: number }>) => {
  const began: { mediaId: number; referrer: string; client: unknown }[] = [];
  const ended: { mediaId: number; referrer: string; client: unknown }[] = [];
  const media: UserMediaPort = {
    ownership: {
      authorizeAttach: async ({ token }) => {
        const r = refs[token];
        if (r === undefined) throw MediaAttachError.notAttachable();
        return {
          referenceId: r.id,
          token: token as never,
          contentType: r.contentType ?? "image/png",
          size: r.size ?? 100,
        };
      },
      authorizeAttachMany: async (inputs) =>
        inputs.map(({ token }) => {
          const r = refs[token];
          if (r === undefined) throw MediaAttachError.notAttachable();
          return {
            referenceId: r.id,
            token: token as never,
            contentType: r.contentType ?? "image/png",
            size: r.size ?? 100,
          };
        }),
      usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
    },
    references: {
      referenceBegan: async ({ mediaId, referrer }, client) => { began.push({ mediaId, referrer, client }); },
      referenceEnded: async ({ mediaId, referrer }, client) => { ended.push({ mediaId, referrer, client }); },
      isReferenced: async () => false,
    },
    resolution: {
      resolveTokens: async (ids) => new Map(ids.map((id) => [id, `tok-${id}` as never])),
      resolveToken: async (id) => `tok-${id}` as never,
    },
  };
  return { media, began, ended };
};

describe("user avatar — set / replace / remove", () => {
  it("sets an avatar on a user that had none — begins, no end, under one tx", async () => {
    const w = makeWorld(null);
    const { media, began, ended } = makeMedia({ tok: { id: 55 } });
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const result = await svc.updateMe(USER, { avatar: { token: "tok" } });

    // The response carries the token from the locked authorizeAttach (the object's
    // own read token), not a redundant re-resolve.
    expect(result.avatar).toEqual({ token: "tok" });
    expect(began).toEqual([{ mediaId: 55, referrer: "user-avatar:7", client: TX }]);
    expect(ended).toHaveLength(0);
    expect(w.updates[0]).toMatchObject({ data: { avatarMediaId: 55 }, client: TX });
  });

  it("replaces an existing avatar — ends the old, begins the new", async () => {
    const w = makeWorld(11);
    const { media, began, ended } = makeMedia({ tok2: { id: 22 } });
    const svc = createUserService(w.repo, media, w.runInTransaction);

    await svc.updateMe(USER, { avatar: { token: "tok2" } });

    expect(ended).toEqual([{ mediaId: 11, referrer: "user-avatar:7", client: TX }]);
    expect(began).toEqual([{ mediaId: 22, referrer: "user-avatar:7", client: TX }]);
  });

  it("removes the avatar with null — ends the reference, sets it null", async () => {
    const w = makeWorld(11);
    const { media, began, ended } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const result = await svc.updateMe(USER, { avatar: null });

    expect(result.avatar).toBeNull();
    expect(ended).toEqual([{ mediaId: 11, referrer: "user-avatar:7", client: TX }]);
    expect(began).toHaveLength(0);
    expect(w.avatar()).toBeNull();
  });

  it("resubmitting the same avatar signals nothing (set-difference)", async () => {
    const w = makeWorld(33);
    const { media, began, ended } = makeMedia({ same: { id: 33 } });
    const svc = createUserService(w.repo, media, w.runInTransaction);

    await svc.updateMe(USER, { avatar: { token: "same" } });

    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
  });

  it("name/bio only (avatar omitted) — no coordination, no transaction", async () => {
    const w = makeWorld(44);
    const { media, began, ended } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const result = await svc.updateMe(USER, { name: "Ada L.", bio: "hello" });

    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
    expect(w.updates[0]!.client).toBeUndefined(); // no tx client → not in a transaction
    expect(result.avatar).toEqual({ token: "tok-44" }); // existing avatar resolved
  });
});

describe("user avatar — policy (ADR 0008 D7)", () => {
  it("rejects a GIF with 422 and coordinates/persists nothing", async () => {
    const w = makeWorld(null);
    const { media, began } = makeMedia({ gif: { id: 9, contentType: "image/gif" } });
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const err = await svc.updateMe(USER, { avatar: { token: "gif" } }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(422);
    expect(began).toHaveLength(0); // policy failed before the reference began
    expect(w.avatar()).toBeNull(); // rolled back
  });

  it("rejects an over-1MiB image with 422", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({ big: { id: 9, contentType: "image/png", size: 1024 * 1024 + 1 } });
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const err = await svc.updateMe(USER, { avatar: { token: "big" } }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(422);
    expect(w.avatar()).toBeNull();
  });

  it("refuses a cross-principal / unknown token opaquely (422), without naming it", async () => {
    const w = makeWorld(null);
    const { media, began } = makeMedia({}); // token not attachable
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const err = await svc.updateMe(USER, { avatar: { token: "someone-elses" } }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(422);
    expect(JSON.stringify(err)).not.toContain("someone-elses");
    expect(began).toHaveLength(0);
  });
});

describe("user profile reads resolve the avatar", () => {
  it("getMe resolves the avatar reference to a token", async () => {
    const w = makeWorld(77);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const me = await svc.getMe(USER);

    expect(me.avatar).toEqual({ token: "tok-77" });
  });

  it("getProfile resolves the avatar reference to a token", async () => {
    const w = makeWorld(88);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const profile = await svc.getProfile("ada");

    expect(profile.avatar).toEqual({ token: "tok-88" });
  });

  it("resolves to null when the user has no avatar", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction);

    expect((await svc.getMe(USER)).avatar).toBeNull();
  });
});

describe("current-user email is self-view only", () => {
  it("getMe (self) includes email", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction);

    expect((await svc.getMe(USER)).email).toBe("ada@example.com");
  });

  it("getProfile (public) does not expose email", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction);

    const profile = await svc.getProfile("ada");

    expect("email" in profile).toBe(false);
  });
});
