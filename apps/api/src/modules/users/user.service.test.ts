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

/** The capability's published query, stubbed: the self-view asks, it never stores. */
const verificationStub = {
  statusOf: async () => "unproven" as const,
  statusOfMany: async (subjects: unknown[]) => subjects.map(() => "unproven" as const),
};

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
  const updates: { data: { name?: string | null; username?: string; bio?: string; avatarMediaId?: number | null }; client: unknown }[] = [];
  const aliases: { username: string; client: unknown }[] = [];
  const released: string[] = [];
  let stored: number | null = currentAvatar;
  let username = "ada";

  const repo: IUserRepository = {
    findByUsernameWithCounts: async () => rawUser({ avatarMediaId: stored, username }),
    findByIdWithCounts: async () => rawUser({ avatarMediaId: stored, username }),
    isFollowing: async () => false,
    countLikesReceived: async () => 0,
    findAvatar: async () => ({ avatarMediaId: stored }),
    updateProfile: async (_userId, data, client) => {
      updates.push({ data, client });
      if (data.avatarMediaId !== undefined) stored = data.avatarMediaId;
      if (data.username !== undefined) username = data.username;
      return rawUser({ name: data.name ?? "Ada", bio: data.bio ?? "", avatarMediaId: stored, username });
    },
    findUsername: async () => ({ username }),
    reserveUsername: async (_userId, u, client) => { aliases.push({ username: u, client }); },
    releaseAlias: async (u) => { released.push(u); },
  } as IUserRepository;

  const runInTransaction: RunInTransaction = async (fn) => {
    const before = { stored, username, aliasCount: aliases.length };
    try {
      return await fn(TX);
    } catch (e) {
      stored = before.stored;
      username = before.username;
      aliases.length = before.aliasCount;
      throw e;
    }
  };

  return { repo, updates, aliases, released, runInTransaction, avatar: () => stored, username: () => username };
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
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

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
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    await svc.updateMe(USER, { avatar: { token: "tok2" } });

    expect(ended).toEqual([{ mediaId: 11, referrer: "user-avatar:7", client: TX }]);
    expect(began).toEqual([{ mediaId: 22, referrer: "user-avatar:7", client: TX }]);
  });

  it("removes the avatar with null — ends the reference, sets it null", async () => {
    const w = makeWorld(11);
    const { media, began, ended } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    const result = await svc.updateMe(USER, { avatar: null });

    expect(result.avatar).toBeNull();
    expect(ended).toEqual([{ mediaId: 11, referrer: "user-avatar:7", client: TX }]);
    expect(began).toHaveLength(0);
    expect(w.avatar()).toBeNull();
  });

  it("resubmitting the same avatar signals nothing (set-difference)", async () => {
    const w = makeWorld(33);
    const { media, began, ended } = makeMedia({ same: { id: 33 } });
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    await svc.updateMe(USER, { avatar: { token: "same" } });

    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
  });

  it("name/bio only (avatar omitted) — no coordination, no transaction", async () => {
    const w = makeWorld(44);
    const { media, began, ended } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

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
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    const err = await svc.updateMe(USER, { avatar: { token: "gif" } }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(422);
    expect(began).toHaveLength(0); // policy failed before the reference began
    expect(w.avatar()).toBeNull(); // rolled back
  });

  it("rejects an over-1MiB image with 422", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({ big: { id: 9, contentType: "image/png", size: 1024 * 1024 + 1 } });
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    const err = await svc.updateMe(USER, { avatar: { token: "big" } }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(422);
    expect(w.avatar()).toBeNull();
  });

  it("refuses a cross-principal / unknown token opaquely (422), without naming it", async () => {
    const w = makeWorld(null);
    const { media, began } = makeMedia({}); // token not attachable
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

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
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    const me = await svc.getMe(USER);

    expect(me.avatar).toEqual({ token: "tok-77" });
  });

  it("getProfile resolves the avatar reference to a token", async () => {
    const w = makeWorld(88);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    const profile = await svc.getProfile("ada");

    expect(profile.avatar).toEqual({ token: "tok-88" });
  });

  it("resolves to null when the user has no avatar", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    expect((await svc.getMe(USER)).avatar).toBeNull();
  });
});

describe("current-user email is self-view only", () => {
  it("getMe (self) includes email", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    expect((await svc.getMe(USER)).email).toBe("ada@example.com");
  });

  it("getProfile (public) does not expose email", async () => {
    const w = makeWorld(null);
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    const profile = await svc.getProfile("ada");

    expect("email" in profile).toBe(false);
  });
});

describe("profile name — set and clear (optional profile data)", () => {
  it("clears name with null — the repository receives name: null, no transaction", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    await svc.updateMe(USER, { name: null });

    expect(w.updates[0]!.data.name).toBeNull();
    expect(w.updates[0]!.client).toBeUndefined(); // no avatar edit → not in a transaction
  });

  it("sets a new name", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, undefined, verificationStub);

    await svc.updateMe(USER, { name: "Ada Lovelace" });

    expect(w.updates[0]!.data.name).toBe("Ada Lovelace");
  });
});

describe("username rename", () => {
  const freeResolver = async () => null;

  it("renames — reserves the old handle and updates to the new, in one transaction", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, freeResolver, verificationStub);

    await svc.updateMe(USER, { username: "ada_new" });

    expect(w.username()).toBe("ada_new");
    expect(w.aliases).toEqual([{ username: "ada", client: TX }]); // old handle reserved in the tx
    expect(w.updates[0]).toMatchObject({ data: { username: "ada_new" }, client: TX });
  });

  it("rejects a handle taken by another account with 409, changing nothing", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const otherHolder = async () => ({ userId: 99, canonicalUsername: "someone", viaAlias: false });
    const svc = createUserService(w.repo, media, w.runInTransaction, otherHolder, verificationStub);

    const err = await svc.updateMe(USER, { username: "taken" }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(409);
    expect(w.username()).toBe("ada"); // unchanged
    expect(w.aliases).toHaveLength(0);
  });

  it("lets a user reclaim their own former handle — frees the self-alias", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const selfAlias = async () => ({ userId: USER, canonicalUsername: "ada", viaAlias: true });
    const svc = createUserService(w.repo, media, w.runInTransaction, selfAlias, verificationStub);

    await svc.updateMe(USER, { username: "ada_old" });

    expect(w.released).toContain("ada_old"); // the reclaimed self-alias is freed
    expect(w.username()).toBe("ada_old");
    expect(w.aliases).toEqual([{ username: "ada", client: TX }]);
  });

  it("is a no-op when the submitted username equals the current one", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const svc = createUserService(w.repo, media, w.runInTransaction, freeResolver, verificationStub);

    await svc.updateMe(USER, { username: "ada" });

    expect(w.aliases).toHaveLength(0);
    expect(w.username()).toBe("ada");
  });

  it("maps a P2002 on the rename to a 409 (a racing duplicate), rolling back", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    (w.repo as { reserveUsername: unknown }).reserveUsername = async () => {
      const e = new Error("Unique constraint failed") as Error & { code?: string };
      e.code = "P2002";
      throw e;
    };
    const svc = createUserService(w.repo, media, w.runInTransaction, freeResolver, verificationStub);

    const err = await svc.updateMe(USER, { username: "raced" }).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(409);
    expect(w.username()).toBe("ada"); // rolled back
  });
});

describe("the self-view's verification projection", () => {
  const askedAbout: { userId: number; endpoint: string }[] = [];

  const verificationSpy = (answer: "unproven" | "pending" | "proven") => ({
    statusOf: async (userId: number, endpoint: string) => {
      askedAbout.push({ userId, endpoint });
      return answer;
    },
    statusOfMany: async (subjects: unknown[]) => subjects.map(() => answer),
  });

  it("reports what the capability says, not anything the account row holds", async () => {
    for (const answer of ["unproven", "pending", "proven"] as const) {
      const w = makeWorld();
      const svc = createUserService(
        w.repo,
        makeMedia({}).media,
        w.runInTransaction,
        undefined,
        verificationSpy(answer),
      );

      await expect(svc.getMe(USER)).resolves.toMatchObject({ emailVerification: answer });
    }
  });

  it("asks about the account's own current address", async () => {
    askedAbout.length = 0;
    const w = makeWorld();
    const svc = createUserService(
      w.repo,
      makeMedia({}).media,
      w.runInTransaction,
      undefined,
      verificationSpy("proven"),
    );

    await svc.getMe(USER);

    expect(askedAbout).toEqual([{ userId: USER, endpoint: "ada@example.com" }]);
  });

  it("carries the projection through a profile update too", async () => {
    const w = makeWorld();
    const svc = createUserService(
      w.repo,
      makeMedia({}).media,
      w.runInTransaction,
      undefined,
      verificationSpy("pending"),
    );

    await expect(svc.updateMe(USER, { bio: "hello" })).resolves.toMatchObject({
      emailVerification: "pending",
    });
  });
});
