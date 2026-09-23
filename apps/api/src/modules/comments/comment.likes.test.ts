/**
 * Likes on a comment — idempotence, the races behind it, and what a guest reads.
 *
 * Every outcome here follows from the service's inputs alone, so the repository
 * is a fake. That the unique pair actually produces the conflict these cases
 * simulate is the database's to say, and is proved in the integration lane.
 */

import { describe, expect, it } from "vitest";

import type { AppError } from "../../shared/errors/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createCommentService, type CommentMediaPort } from "./comment.service";
import type { CommentWithRelations, ICommentRepository } from "./comment.types";

const READER = 7;
const COMMENT = 11;

/** What Prisma raises when the unique pair already holds a row, and when it does not. */
const prismaError = (code: string) => Object.assign(new Error(code), { code });

const raw = (over: Partial<CommentWithRelations> = {}): CommentWithRelations => ({
  id: COMMENT,
  body: "nice",
  authorId: 1,
  tweetId: 3,
  parentId: null,
  mediaId: null,
  editedAt: null,
  createdAt: new Date(),
  author: { id: 1, username: "ada", name: "Ada", avatarMediaId: null },
  _count: { replies: 0, likes: 0 },
  ...over,
});

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
  const state = {
    commentExists: true,
    likesCount: 0,
    createLikeError: null as unknown,
    deleteLikeError: null as unknown,
    thread: [] as CommentWithRelations[],
  };
  const calls = {
    created: [] as [number, number][],
    deleted: [] as [number, number][],
    threadReader: [] as (number | undefined)[],
  };

  const repo = {
    tweetExists: async () => true,
    findThread: async (_t: number, _p: unknown, userId?: number) => {
      calls.threadReader.push(userId);
      return state.thread;
    },
    findReplies: async () => state.thread,
    findParent: async () => null,
    findById: async () => null,
    create: async () => raw(),
    update: async () => raw(),
    delete: async () => {},
    findOwner: async () => null,
    findReplyMediaRefs: async () => [],
    deleteRepliesOf: async () => 0,
    findMediaRefsByTweet: async () => [],
    deleteRepliesByTweet: async () => 0,
    deleteByTweet: async () => 0,
    commentExists: async () => state.commentExists,
    createLike: async (userId: number, commentId: number) => {
      calls.created.push([userId, commentId]);
      if (state.createLikeError) throw state.createLikeError;
    },
    deleteLike: async (userId: number, commentId: number) => {
      calls.deleted.push([userId, commentId]);
      if (state.deleteLikeError) throw state.deleteLikeError;
    },
    getLikesCount: async () => state.likesCount,
  } as unknown as ICommentRepository;

  const runInTransaction: RunInTransaction = async (fn) => fn({} as never);
  const svc = createCommentService(repo, inertMedia(), runInTransaction);
  return { svc, state, calls };
};

const statusOf = async (run: Promise<unknown>): Promise<number> =>
  ((await run.catch((e: unknown) => e)) as AppError).statusCode;

// ─── Setting a like ──────────────────────────────────────────────────────────

describe("setLike", () => {
  it("reports the state the reader asked for, and the fresh count", async () => {
    const w = makeWorld();
    w.state.likesCount = 4;

    expect(await w.svc.setLike(READER, COMMENT)).toEqual({ liked: true, likesCount: 4 });
    expect(w.calls.created).toEqual([[READER, COMMENT]]);
  });

  it("is idempotent: liking twice leaves one like and answers liked both times", async () => {
    const w = makeWorld();

    const first = await w.svc.setLike(READER, COMMENT);
    // The second attempt meets the unique pair, which is the whole mechanism.
    w.state.createLikeError = prismaError("P2002");
    const second = await w.svc.setLike(READER, COMMENT);

    expect(first.liked).toBe(true);
    expect(second.liked).toBe(true); // never a 409 — a double press is not an error
  });

  it("does not swallow a failure that is not the expected conflict", async () => {
    const w = makeWorld();
    w.state.createLikeError = prismaError("P2003"); // a foreign key, say

    await expect(w.svc.setLike(READER, COMMENT)).rejects.toThrow();
  });

  it("404s a comment that does not exist, without writing", async () => {
    const w = makeWorld();
    w.state.commentExists = false;

    expect(await statusOf(w.svc.setLike(READER, COMMENT))).toBe(404);
    expect(w.calls.created).toEqual([]);
  });
});

// ─── Clearing a like ─────────────────────────────────────────────────────────

describe("clearLike", () => {
  it("reports not-liked and the fresh count", async () => {
    const w = makeWorld();
    w.state.likesCount = 2;

    expect(await w.svc.clearLike(READER, COMMENT)).toEqual({ liked: false, likesCount: 2 });
    expect(w.calls.deleted).toEqual([[READER, COMMENT]]);
  });

  it("is idempotent: unliking something not liked is not a refusal", async () => {
    const w = makeWorld();
    w.state.deleteLikeError = prismaError("P2025"); // the row was already gone

    expect(await w.svc.clearLike(READER, COMMENT)).toEqual({ liked: false, likesCount: 0 });
  });

  it("does not swallow a failure that is not the expected absence", async () => {
    const w = makeWorld();
    w.state.deleteLikeError = prismaError("P2003");

    await expect(w.svc.clearLike(READER, COMMENT)).rejects.toThrow();
  });

  it("404s a comment that does not exist, without writing", async () => {
    const w = makeWorld();
    w.state.commentExists = false;

    expect(await statusOf(w.svc.clearLike(READER, COMMENT))).toBe(404);
    expect(w.calls.deleted).toEqual([]);
  });
});

// ─── What a comment carries ──────────────────────────────────────────────────

describe("the like fields on a comment", () => {
  it("counts the likes, and reads liked when the reader's own row came back", async () => {
    const w = makeWorld();
    w.state.thread = [raw({ _count: { replies: 0, likes: 9 }, likes: [{ userId: READER }] })];

    const { data } = await w.svc.getThread(3, { limit: 10 }, READER);

    expect(data[0]!.likesCount).toBe(9);
    expect(data[0]!.isLiked).toBe(true);
  });

  it("reads not-liked for a signed-in reader who has not liked it", async () => {
    const w = makeWorld();
    w.state.thread = [raw({ _count: { replies: 0, likes: 9 }, likes: [] })];

    const { data } = await w.svc.getThread(3, { limit: 10 }, READER);

    expect(data[0]!.isLiked).toBe(false);
  });

  it("reads not-liked for a guest, whose query never asked", async () => {
    const w = makeWorld();
    // No `likes` key at all — the guest's query omits it entirely.
    w.state.thread = [raw({ _count: { replies: 0, likes: 9 } })];

    const { data } = await w.svc.getThread(3, { limit: 10 });

    expect(data[0]!.isLiked).toBe(false);
    expect(data[0]!.likesCount).toBe(9); // the count is public; only the state is personal
  });

  it("passes the reader to the query, and nothing when there is none", async () => {
    const w = makeWorld();

    await w.svc.getThread(3, { limit: 10 }, READER);
    await w.svc.getThread(3, { limit: 10 });

    expect(w.calls.threadReader).toEqual([READER, undefined]);
  });
});
