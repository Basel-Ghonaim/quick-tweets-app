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

const rawTweet = (id: number, media: TweetMediaRef[] = []) => ({
  id,
  body: "hello",
  authorId: AUTHOR,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: AUTHOR, username: "ada", name: "Ada", profileImage: null },
  _count: { likes: 0, comments: 0 },
  media,
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
      return rawTweet(1, stored.get(1) ?? []) as never;
    },
    update: async () => rawTweet(1, stored.get(1) ?? []) as never,
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
      authorizeAttachMany: async (inputs) =>
        inputs.map(({ token }) => {
          const referenceId = refs[token];
          if (referenceId === undefined) throw MediaAttachError.notAttachable();
          return { referenceId, token: token as never };
        }),
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

describe("tweet edit — full replacement", () => {
  it("signals only the difference: removed ends, added begins", async () => {
    const w = makeWorld();
    w.stored.set(1, [{ mediaId: 11, position: 0 }, { mediaId: 22, position: 1 }]);
    const { media, began, ended } = makeMedia({ tokB: 22, tokC: 33 });
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await svc.update(1, AUTHOR, { media: ["tokB", "tokC"] }); // 11 out, 33 in

    expect(ended).toEqual([{ mediaId: 11, referrer: "tweet:1", client: TX }]);
    expect(began).toEqual([{ mediaId: 33, referrer: "tweet:1", client: TX }]);
  });

  it("signals nothing when media is only reordered", async () => {
    // Rows are rewritten wholesale, but a reordered object never stopped being
    // referenced — ending and re-beginning it would misrepresent what happened.
    const w = makeWorld();
    w.stored.set(1, [{ mediaId: 11, position: 0 }, { mediaId: 22, position: 1 }]);
    const { media, began, ended } = makeMedia({ tokA: 11, tokB: 22 });
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await svc.update(1, AUTHOR, { media: ["tokB", "tokA"] });

    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
    expect(w.stored.get(1)).toEqual([
      { mediaId: 22, position: 0 },
      { mediaId: 11, position: 1 },
    ]);
  });

  it("an empty array removes every reference", async () => {
    const w = makeWorld();
    w.stored.set(1, [{ mediaId: 11, position: 0 }]);
    const { media, ended } = makeMedia({});
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await svc.update(1, AUTHOR, { media: [] });

    expect(ended).toEqual([{ mediaId: 11, referrer: "tweet:1", client: TX }]);
    expect(w.stored.get(1)).toEqual([]);
  });

  it("omitting media leaves the existing references untouched", async () => {
    const w = makeWorld();
    w.stored.set(1, [{ mediaId: 11, position: 0 }]);
    const { media, began, ended } = makeMedia({});
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await svc.update(1, AUTHOR, { body: "edited" });

    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
    expect(w.stored.get(1)).toEqual([{ mediaId: 11, position: 0 }]);
  });

  it("rolls back and signals nothing when a replacement is not attachable", async () => {
    const w = makeWorld();
    w.stored.set(1, [{ mediaId: 11, position: 0 }]);
    const { media, began, ended } = makeMedia({});
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await svc.update(1, AUTHOR, { media: ["not-mine"] }).catch(() => {});

    expect(w.stored.get(1)).toEqual([{ mediaId: 11, position: 0 }]);
    expect(began).toHaveLength(0);
    expect(ended).toHaveLength(0);
  });
});

describe("tweet delete primitives", () => {
  it("deleteWithMedia ends every reference the tweet held, before the row goes", async () => {
    const w = makeWorld();
    w.stored.set(1, [{ mediaId: 11, position: 0 }, { mediaId: 22, position: 1 }]);
    const { media, ended } = makeMedia({});
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    // Runs in the caller's transaction (the use-case's), passed as TX.
    await svc.deleteWithMedia(1, TX);

    expect(ended).toEqual([
      { mediaId: 11, referrer: "tweet:1", client: TX },
      { mediaId: 22, referrer: "tweet:1", client: TX },
    ]);
    // Rows dropped in that transaction, so TweetMedia's Restrict never fires.
    expect(w.stored.get(1)).toEqual([]);
  });

  it("deleteWithMedia signals nothing for a tweet with no media", async () => {
    const w = makeWorld();
    const { media, ended } = makeMedia({});
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await svc.deleteWithMedia(1, TX);

    expect(ended).toHaveLength(0);
  });

  it("assertOwner passes for the author and forbids a non-owner", async () => {
    const w = makeWorld();
    const { media } = makeMedia({});
    const svc = createTweetService(w.repo, media, w.runInTransaction);

    await expect(svc.assertOwner(1, AUTHOR, TX)).resolves.toBeUndefined();

    const err = await svc.assertOwner(1, 999, TX).catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(403);
  });
});

describe("tweet create — no-media path", () => {
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
