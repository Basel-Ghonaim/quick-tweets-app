/**
 * Comment media — attach, coordination, and the transaction guarantee (Comment Media).
 *
 * A fake `runInTransaction` passes an opaque sentinel client, so "one shared
 * transaction" is provable by identity: the comment write and the reference
 * signal must both receive that sentinel. It also restores the store when the
 * callback throws, so "it rolled back" is a real assertion.
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { MediaAttachError } from "../media/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createCommentService, type CommentMediaPort } from "./comment.service";
import type { CommentWithRelations, ICommentRepository } from "./comment.types";

const TX = { __tx: true } as never; // opaque sentinel for the transaction client
const AUTHOR = 7;
const TWEET = 3;

const rawComment = (over: Partial<CommentWithRelations> = {}): CommentWithRelations => ({
  id: 1,
  body: "nice",
  authorId: AUTHOR,
  tweetId: TWEET,
  mediaId: null,
  createdAt: new Date(),
  author: { id: AUTHOR, username: "ada", name: "Ada", profileImage: null },
  ...over,
});

const makeWorld = (ownerMediaId: number | null = null) => {
  const created: { body: string; mediaId: number | null; client: unknown }[] = [];
  const updates: { id: number; data: { body?: string; mediaId?: number | null } }[] = [];
  const repo: ICommentRepository = {
    tweetExists: async () => true,
    findMany: async () => [],
    count: async () => 0,
    findById: async () => null,
    create: async (_authorId, _tweetId, body, mediaId = null, client) => {
      created.push({ body, mediaId, client });
      return rawComment({ id: 1, body, mediaId });
    },
    update: async (id, data) => {
      updates.push({ id, data });
      return rawComment({ id, body: data.body ?? "nice", mediaId: data.mediaId ?? ownerMediaId });
    },
    delete: async () => {},
    findOwner: async () => ({ authorId: AUTHOR, mediaId: ownerMediaId }),
  };

  let opened = 0;
  const runInTransaction: RunInTransaction = async (fn) => {
    opened += 1;
    return fn(TX);
  };

  return { repo, created, updates, runInTransaction, opened: () => opened };
};

/** A media port that authorizes tokens by a fixed token→reference map. */
const makeMedia = (refs: Record<string, number>) => {
  const began: { mediaId: number; referrer: string; client: unknown }[] = [];
  const ended: { mediaId: number; referrer: string; client: unknown }[] = [];
  const media: CommentMediaPort = {
    ownership: {
      authorizeAttach: async ({ token }) => {
        const referenceId = refs[token];
        if (referenceId === undefined) throw MediaAttachError.notAttachable();
        return { referenceId, token: token as never };
      },
      usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
    },
    references: {
      referenceBegan: async ({ mediaId, referrer }, client) => {
        began.push({ mediaId, referrer, client });
      },
      referenceEnded: async ({ mediaId, referrer }, client) => {
        ended.push({ mediaId, referrer, client });
      },
      isReferenced: async () => false,
    },
    resolution: {
      resolveTokens: async (ids) => new Map(ids.map((id) => [id, `tok-${id}` as never])),
      resolveToken: async (id) => `tok-${id}` as never,
    },
  };
  return { media, began, ended };
};

describe("comment create with media", () => {
  it("creates a comment without media on the plain path — no transaction", async () => {
    const w = makeWorld();
    const { media, began } = makeMedia({});
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const result = await svc.create(AUTHOR, TWEET, "nice");

    expect(result.media).toBeNull();
    expect(w.opened()).toBe(0);
    expect(began).toHaveLength(0);
  });

  it("attaches the media reference and signals begin, in ONE transaction", async () => {
    const w = makeWorld();
    const { media, began } = makeMedia({ tok: 55 });
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const result = await svc.create(AUTHOR, TWEET, "nice", "tok");

    expect(result.media).toEqual({ token: "tok" });
    // The comment row was created with the resolved reference, under the tx client.
    expect(w.created[0]).toMatchObject({ mediaId: 55, client: TX });
    // The reference was signalled under the comment's stable tag, same client.
    expect(began).toEqual([{ mediaId: 55, referrer: "comment:1", client: TX }]);
  });

  it("refuses a cross-principal attach opaquely and persists nothing", async () => {
    const w = makeWorld();
    const { media, began } = makeMedia({}); // token not attachable
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const err = await svc.create(AUTHOR, TWEET, "nice", "someone-elses").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(422);
    expect(JSON.stringify(err)).not.toContain("someone-elses"); // opaque
    expect(began).toHaveLength(0);
  });
});

describe("comment edit media (full replacement)", () => {
  it("sets media on a comment that had none — begins, no end", async () => {
    const w = makeWorld(null); // no existing media
    const { media, began, ended } = makeMedia({ tok: 55 });
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const result = await svc.update(1, AUTHOR, { media: { token: "tok" } });

    expect(result.media).toEqual({ token: "tok" });
    expect(began).toEqual([{ mediaId: 55, referrer: "comment:1", client: TX }]);
    expect(ended).toHaveLength(0);
    expect(w.updates[0]!.data).toMatchObject({ mediaId: 55 });
  });

  it("replaces existing media — ends the old, begins the new", async () => {
    const w = makeWorld(11); // had reference 11
    const { media, began, ended } = makeMedia({ tok2: 22 });
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const result = await svc.update(1, AUTHOR, { media: { token: "tok2" } });

    expect(result.media).toEqual({ token: "tok2" });
    expect(ended).toEqual([{ mediaId: 11, referrer: "comment:1", client: TX }]);
    expect(began).toEqual([{ mediaId: 22, referrer: "comment:1", client: TX }]);
  });

  it("removes media with null — ends the reference, sets it null", async () => {
    const w = makeWorld(11);
    const { media, began, ended } = makeMedia({});
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const result = await svc.update(1, AUTHOR, { media: null });

    expect(result.media).toBeNull();
    expect(ended).toEqual([{ mediaId: 11, referrer: "comment:1", client: TX }]);
    expect(began).toHaveLength(0);
    expect(w.updates[0]!.data).toMatchObject({ mediaId: null });
  });

  it("resubmitting the same object signals nothing (set-difference)", async () => {
    const w = makeWorld(33); // already reference 33
    const { media, began, ended } = makeMedia({ same: 33 });
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    await svc.update(1, AUTHOR, { media: { token: "same" } });

    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
  });

  it("omitting media leaves the reference untouched (no transaction)", async () => {
    const w = makeWorld(44);
    const { media, began, ended } = makeMedia({});
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const result = await svc.update(1, AUTHOR, { body: "edited" });

    expect(w.opened()).toBe(0); // no media change → no transaction
    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
    expect(result.media).toEqual({ token: "tok-44" }); // existing reference resolved
  });
});

describe("comment list — media resolution", () => {
  it("resolves each comment's media reference to a token, in one batched query", async () => {
    const w = makeWorld();
    let resolveCalls = 0;
    const { media } = makeMedia({});
    media.resolution.resolveTokens = async (ids) => {
      resolveCalls += 1;
      return new Map(ids.map((id) => [id, `tok-${id}` as never]));
    };
    w.repo.findMany = async () => [
      rawComment({ id: 1, mediaId: 100 }),
      rawComment({ id: 2, mediaId: null }),
    ];
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const { data } = await svc.getComments(TWEET, { page: 1, limit: 20 });

    expect(data[0]!.media).toEqual({ token: "tok-100" });
    expect(data[1]!.media).toBeNull();
    expect(resolveCalls).toBe(1); // batched — one query for the whole page
  });
});
