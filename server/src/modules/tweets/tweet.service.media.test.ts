/**
 * Tweet media — attach, coordination, and the transaction guarantee (M9).
 *
 * A fake `runInTransaction` passes an opaque sentinel client, so "one shared
 * transaction" is provable by identity: the tweet write, the media rows, and
 * the reference signals must all receive that sentinel. It also restores the
 * store when the callback throws, so "it rolled back" is a real assertion.
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { MediaAttachError } from "../media/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createTweetService, type TweetMediaPort } from "./tweet.service";
import type { ITweetRepository, TweetMediaRef } from "./tweet.types";

const TX = { __tx: true } as never; // opaque sentinel for the transaction client
const AUTHOR = 7;

const rawTweet = (id: number) => ({
  id,
  body: "hello",
  authorId: AUTHOR,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: AUTHOR, username: "ada", name: "Ada", profileImage: null },
  _count: { likes: 0, comments: 0 },
});

const makeWorld = () => {
  const stored = new Map<number, TweetMediaRef[]>();
  const calls = {
    create: [] as unknown[],
    replace: [] as { tweetId: number; refs: TweetMediaRef[]; client: unknown }[],
  };

  const repo: ITweetRepository = {
    findMany: async () => [],
    findByAuthor: async () => [],
    findAuthorIdByUsername: async () => null,
    findById: async () => null,
    create: async (authorId, body, client) => {
      calls.create.push(client);
      return rawTweet(1) as never;
    },
    update: async () => rawTweet(1) as never,
    delete: async () => {},
    findOwner: async () => ({ authorId: AUTHOR }),
    findMediaRefs: async (tweetId) => stored.get(tweetId) ?? [],
    replaceMediaRefs: async (tweetId, refs, client) => {
      calls.replace.push({ tweetId, refs, client });
      stored.set(tweetId, refs);
    },
    findLike: async () => null,
    createLike: async () => {},
    deleteLike: async () => {},
    getLikesCount: async () => 0,
  };

  const runInTransaction: RunInTransaction = async (fn) => {
    const before = new Map(stored);
    try {
      return await fn(TX);
    } catch (e) {
      stored.clear();
      before.forEach((v, k) => stored.set(k, v));
      throw e;
    }
  };

  return { repo, stored, calls, runInTransaction };
};

/** A media port that authorizes tokens by a fixed token→reference map. */
const makeMedia = (refs: Record<string, number>) => {
  const began: { mediaId: number; referrer: string; client: unknown }[] = [];
  const ended: { mediaId: number; referrer: string; client: unknown }[] = [];
  const media: TweetMediaPort = {
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
  };
  return { media, began, ended };
};

describe("tweet create with media", () => {
  it("attaches ordered references and signals each one, in ONE transaction", async () => {
    const w = makeWorld();
    const { media, began } = makeMedia({ tokA: 11, tokB: 22 });
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await svc.create(AUTHOR, "hello", ["tokA", "tokB"]);

    // Array order became position.
    expect(w.calls.replace[0]!.refs).toEqual([
      { mediaId: 11, position: 0 },
      { mediaId: 22, position: 1 },
    ]);
    // Every reference was signalled, under the tweet's stable referrer tag.
    expect(began).toEqual([
      { mediaId: 11, referrer: "tweet:1", client: TX },
      { mediaId: 22, referrer: "tweet:1", client: TX },
    ]);
    // The single-transaction proof: every write got the SAME sentinel client.
    expect(w.calls.create[0]).toBe(TX);
    expect(w.calls.replace[0]!.client).toBe(TX);
  });

  it("rolls everything back when one reference is not attachable", async () => {
    const w = makeWorld();
    const { media, began } = makeMedia({ tokA: 11 }); // tokB is not the author's
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    const err = await svc.create(AUTHOR, "hello", ["tokA", "tokB"]).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(422);
    expect(w.stored.size).toBe(0); // no media rows survived
    expect(began).toHaveLength(0); // and nothing was signalled
  });

  it("refuses a cross-principal attach opaquely, without naming the token", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    const err = await svc.create(AUTHOR, "hello", ["someone-elses"]).catch((e: unknown) => e);

    expect(JSON.stringify(err)).not.toContain("someone-elses");
  });

  it("takes the plain path when no media is submitted", async () => {
    const w = makeWorld();
    const { media, began } = makeMedia({});
    let opened = 0;
    const runInTransaction: RunInTransaction = async (fn) => {
      opened += 1;
      return w.runInTransaction(fn);
    };
    const svc = createTweetService(w.repo, media, runInTransaction);

    await svc.create(AUTHOR, "hello");

    expect(opened).toBe(0); // no media, no transaction
    expect(began).toHaveLength(0);
  });
});
