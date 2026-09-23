/**
 * The comment thread — its two levels, its pages, and what each refusal means.
 *
 * Every outcome here follows from the service's inputs alone, so the repository
 * and Media are fakes. What needs a real database — that the cascade is one
 * transaction the database honours, and that a cursor is stable under a
 * concurrent insert — is proved next door, in the integration lane.
 *
 * The transaction fake passes an opaque sentinel, so "in one transaction" is
 * provable by identity rather than by inspection.
 */

import { describe, expect, it } from "vitest";

import type { AppError } from "../../shared/errors/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createCommentService, type CommentMediaPort } from "./comment.service";
import type { CommentWithRelations, ICommentRepository } from "./comment.types";

const TX = { __tx: true } as never;
const AUTHOR = 7;
const TWEET = 3;
const PARENT = 40;

const raw = (over: Partial<CommentWithRelations> = {}): CommentWithRelations => ({
  id: 1,
  body: "nice",
  authorId: AUTHOR,
  tweetId: TWEET,
  parentId: null,
  mediaId: null,
  createdAt: new Date(),
  author: { id: AUTHOR, username: "ada", name: "Ada", avatarMediaId: null },
  _count: { replies: 0, likes: 0 },
  ...over,
});

/** A run of comments with ascending ids, which is also their thread order. */
const rows = (from: number, n: number, over: Partial<CommentWithRelations> = {}) =>
  Array.from({ length: n }, (_, i) => raw({ id: from + i, ...over }));

const inertMedia = (): CommentMediaPort => ({
  ownership: {
    authorizeAttach: async () => {
      throw new Error("no attach in these cases");
    },
    authorizeAttachMany: async () => [],
    usageFor: async () => ({}) as never,
  },
  references: {
    referenceBegan: async () => {},
    referenceEnded: async () => {},
    isReferenced: async () => false,
  },
  resolution: {
    resolveTokens: async () => new Map(),
    resolveToken: async () => null,
  },
});

const makeWorld = () => {
  const calls = {
    thread: [] as [number, unknown][],
    replies: [] as [number, unknown][],
  };
  const deleted = {
    replies: [] as number[],
    rows: [] as number[],
    repliesByTweet: [] as number[],
    byTweet: [] as number[],
  };
  const clients: unknown[] = [];
  const likes = { created: [] as [number, number][], deleted: [] as [number, number][] };

  const state = {
    tweetExists: true,
    commentExists: true,
    likesCount: 0,
    createLikeError: null as unknown,
    deleteLikeError: null as unknown,
    parent: null as { id: number; tweetId: number; parentId: number | null } | null,
    thread: [] as CommentWithRelations[],
    replyPage: [] as CommentWithRelations[],
    owner: { authorId: AUTHOR, mediaId: null as number | null, parentId: null as number | null },
    replyMediaRefs: [] as { id: number; mediaId: number }[],
    tweetMediaRefs: [] as { id: number; mediaId: number }[],
  };

  const repo: ICommentRepository = {
    tweetExists: async () => state.tweetExists,
    findThread: async (tweetId, params) => {
      calls.thread.push([tweetId, params]);
      return state.thread;
    },
    findReplies: async (parentId, params) => {
      calls.replies.push([parentId, params]);
      return state.replyPage;
    },
    findParent: async () => state.parent,
    commentExists: async () => state.commentExists,
    createLike: async (userId, commentId) => {
      likes.created.push([userId, commentId]);
      if (state.createLikeError) throw state.createLikeError;
    },
    deleteLike: async (userId, commentId) => {
      likes.deleted.push([userId, commentId]);
      if (state.deleteLikeError) throw state.deleteLikeError;
    },
    getLikesCount: async () => state.likesCount,
    findById: async () => null,
    create: async (data) => raw({ id: 99, body: data.body, parentId: data.parentId ?? null }),
    update: async (id) => raw({ id }),
    delete: async (id, client) => {
      deleted.rows.push(id);
      clients.push(client);
    },
    findOwner: async () => state.owner,
    findReplyMediaRefs: async () => state.replyMediaRefs,
    deleteRepliesOf: async (parentId, client) => {
      deleted.replies.push(parentId);
      clients.push(client);
      return 0;
    },
    findMediaRefsByTweet: async () => state.tweetMediaRefs,
    deleteRepliesByTweet: async (tweetId) => {
      deleted.repliesByTweet.push(tweetId);
      return 0;
    },
    deleteByTweet: async (tweetId) => {
      deleted.byTweet.push(tweetId);
      return 0;
    },
  };

  let opened = 0;
  const runInTransaction: RunInTransaction = async (fn) => {
    opened += 1;
    return fn(TX);
  };

  return { repo, state, calls, deleted, likes, clients, runInTransaction, opened: () => opened };
};

const statusOf = async (run: Promise<unknown>): Promise<number> =>
  ((await run.catch((e: unknown) => e)) as AppError).statusCode;

// ─── The thread: a tweet's top-level comments ────────────────────────────────

describe("getThread", () => {
  it("404s when the tweet does not exist", async () => {
    const w = makeWorld();
    w.state.tweetExists = false;
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    expect(await statusOf(svc.getThread(TWEET, { limit: 10 }))).toBe(404);
  });

  it("asks only for top-level comments, and passes the cursor through", async () => {
    const w = makeWorld();
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    await svc.getThread(TWEET, { cursor: 12, limit: 5 });

    expect(w.calls.thread).toEqual([[TWEET, { cursor: 12, limit: 5 }]]);
    expect(w.calls.replies).toEqual([]); // replies never ride the thread query
  });

  it("drops the look-ahead row, reports hasMore, and cursors on the last id returned", async () => {
    const w = makeWorld();
    w.state.thread = rows(10, 4); // limit 3, plus the extra row
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    const { data, meta } = await svc.getThread(TWEET, { limit: 3 });

    expect(data.map((c) => c.id)).toEqual([10, 11, 12]);
    expect(meta).toEqual({ nextCursor: "12", limit: 3, hasMore: true });
  });

  it("ends the list with no cursor when the look-ahead row is absent", async () => {
    const w = makeWorld();
    w.state.thread = rows(10, 2);
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    const { data, meta } = await svc.getThread(TWEET, { limit: 3 });

    expect(data).toHaveLength(2);
    expect(meta).toEqual({ nextCursor: null, limit: 3, hasMore: false });
  });

  it("carries a reply count on a top-level comment", async () => {
    const w = makeWorld();
    w.state.thread = [raw({ id: 10, _count: { replies: 4, likes: 0 } })];
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    const { data } = await svc.getThread(TWEET, { limit: 10 });

    expect(data[0]!.repliesCount).toBe(4);
    expect(data[0]!.parentId).toBeNull();
  });
});

// ─── The replies of one comment ──────────────────────────────────────────────

describe("getReplies", () => {
  it("404s when the parent does not exist", async () => {
    const w = makeWorld();
    w.state.parent = null;
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    expect(await statusOf(svc.getReplies(PARENT, { limit: 10 }))).toBe(404);
  });

  it("pages the parent's replies the way the thread pages", async () => {
    const w = makeWorld();
    w.state.parent = { id: PARENT, tweetId: TWEET, parentId: null };
    w.state.replyPage = rows(20, 3, { parentId: PARENT });
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    const { data, meta } = await svc.getReplies(PARENT, { cursor: 19, limit: 2 });

    expect(w.calls.replies).toEqual([[PARENT, { cursor: 19, limit: 2 }]]);
    expect(data.map((c) => c.id)).toEqual([20, 21]);
    expect(meta).toEqual({ nextCursor: "21", limit: 2, hasMore: true });
  });

  it("gives a reply no reply count, since a reply cannot be answered", async () => {
    const w = makeWorld();
    w.state.parent = { id: PARENT, tweetId: TWEET, parentId: null };
    w.state.replyPage = [raw({ id: 20, parentId: PARENT })];
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    const { data } = await svc.getReplies(PARENT, { limit: 10 });

    expect(data[0]!.parentId).toBe(PARENT);
    expect("repliesCount" in data[0]!).toBe(false);
  });
});

// ─── Answering a comment ─────────────────────────────────────────────────────

describe("create — the parent a reply names", () => {
  const svcFor = (w: ReturnType<typeof makeWorld>) =>
    createCommentService(w.repo, inertMedia(), w.runInTransaction);

  it("404s when the parent does not exist, as a missing tweet already does", async () => {
    const w = makeWorld();
    w.state.parent = null;

    expect(await statusOf(svcFor(w).create(AUTHOR, TWEET, "hi", undefined, PARENT))).toBe(404);
  });

  it("422s a parent that sits on another tweet", async () => {
    const w = makeWorld();
    w.state.parent = { id: PARENT, tweetId: TWEET + 1, parentId: null };

    expect(await statusOf(svcFor(w).create(AUTHOR, TWEET, "hi", undefined, PARENT))).toBe(422);
  });

  it("422s a parent that is itself a reply, rather than re-pointing it", async () => {
    const w = makeWorld();
    w.state.parent = { id: PARENT, tweetId: TWEET, parentId: 1 };

    expect(await statusOf(svcFor(w).create(AUTHOR, TWEET, "hi", undefined, PARENT))).toBe(422);
  });

  it("stores the reply under a top-level parent on the same tweet", async () => {
    const w = makeWorld();
    w.state.parent = { id: PARENT, tweetId: TWEET, parentId: null };

    const created = await svcFor(w).create(AUTHOR, TWEET, "hi", undefined, PARENT);

    expect(created.parentId).toBe(PARENT);
  });

  it("leaves the parent null when none is named", async () => {
    const w = makeWorld();

    const created = await svcFor(w).create(AUTHOR, TWEET, "hi");

    expect(created.parentId).toBeNull();
  });

  it("refuses the parent before any media is attached, so no reference is begun", async () => {
    const w = makeWorld();
    w.state.parent = { id: PARENT, tweetId: TWEET, parentId: 1 }; // a reply — refused
    const media = inertMedia();
    const began: string[] = [];
    media.references.referenceBegan = async (ref) => {
      began.push(ref.referrer);
    };
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    expect(await statusOf(svc.create(AUTHOR, TWEET, "hi", "some-token", PARENT))).toBe(422);
    expect(began).toEqual([]);
    expect(w.opened()).toBe(0); // the attach transaction never opened
  });
});

// ─── Deleting ────────────────────────────────────────────────────────────────

describe("delete — a comment takes its replies with it", () => {
  it("ends every reply's reference, removes the replies, then the parent — on one transaction", async () => {
    const w = makeWorld();
    w.state.owner = { authorId: AUTHOR, mediaId: 77, parentId: null };
    w.state.replyMediaRefs = [
      { id: 50, mediaId: 500 },
      { id: 51, mediaId: 501 },
    ];

    const order: string[] = [];
    const clients: unknown[] = [];
    const media = inertMedia();
    media.references.referenceEnded = async (ref, client) => {
      order.push(`end:${ref.referrer}`);
      clients.push(client);
    };
    const repo: ICommentRepository = {
      ...w.repo,
      deleteRepliesOf: async (_parentId, client) => {
        order.push("delete:replies");
        clients.push(client);
        return 0;
      },
      delete: async (_id, client) => {
        order.push("delete:parent");
        clients.push(client);
      },
    };
    const svc = createCommentService(repo, media, w.runInTransaction);

    await svc.delete(1, AUTHOR);

    expect(order).toEqual([
      "end:comment:50",
      "end:comment:51",
      "delete:replies",
      "end:comment:1",
      "delete:parent",
    ]);
    expect(w.opened()).toBe(1);
    // One transaction, proved by identity rather than by counting calls.
    expect(clients.every((c) => c === TX)).toBe(true);
  });

  it("403s someone else's comment before touching anything", async () => {
    const w = makeWorld();
    w.state.owner = { authorId: AUTHOR + 1, mediaId: null, parentId: null };
    const svc = createCommentService(w.repo, inertMedia(), w.runInTransaction);

    expect(await statusOf(svc.delete(1, AUTHOR))).toBe(403);
    expect(w.deleted.rows).toEqual([]);
    expect(w.deleted.replies).toEqual([]);
  });
});

describe("deleteForTweet — both levels, in dependency order", () => {
  // Postgres would accept one statement covering both levels: a RESTRICT check
  // passes when the referencing row goes in the same statement. The order is
  // kept so the code does not rest on when a constraint happens to be checked.
  it("removes the replies before their parents, in dependency order", async () => {
    const w = makeWorld();
    w.state.tweetMediaRefs = [{ id: 50, mediaId: 500 }];

    const order: string[] = [];
    const media = inertMedia();
    media.references.referenceEnded = async (ref) => {
      order.push(`end:${ref.referrer}`);
    };
    const repo: ICommentRepository = {
      ...w.repo,
      deleteRepliesByTweet: async () => {
        order.push("delete:replies");
        return 0;
      },
      deleteByTweet: async () => {
        order.push("delete:rest");
        return 0;
      },
    };
    const svc = createCommentService(repo, media, w.runInTransaction);

    await svc.deleteForTweet(TWEET, TX);

    expect(order).toEqual(["end:comment:50", "delete:replies", "delete:rest"]);
  });
});
