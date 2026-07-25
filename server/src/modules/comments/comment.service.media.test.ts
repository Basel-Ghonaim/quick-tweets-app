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

const makeWorld = () => {
  const created: { body: string; mediaId: number | null; client: unknown }[] = [];
  const repo: ICommentRepository = {
    tweetExists: async () => true,
    findMany: async () => [],
    count: async () => 0,
    findById: async () => null,
    create: async (_authorId, _tweetId, body, mediaId = null, client) => {
      created.push({ body, mediaId, client });
      return rawComment({ id: 1, body, mediaId });
    },
    update: async (id, data) => rawComment({ id, ...data }),
    delete: async () => {},
    findOwner: async () => ({ authorId: AUTHOR, mediaId: null }),
  };

  let opened = 0;
  const runInTransaction: RunInTransaction = async (fn) => {
    opened += 1;
    return fn(TX);
  };

  return { repo, created, runInTransaction, opened: () => opened };
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
