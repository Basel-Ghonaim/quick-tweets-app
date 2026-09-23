/**
 * Comment media — attach, coordination, and the transaction guarantee (Comment Media).
 *
 * A fake `runInTransaction` passes an opaque sentinel client, so "one shared
 * transaction" is provable by identity: the comment write and the reference
 * signal must both receive that sentinel. It also restores the store when the
 * callback throws, so "it rolled back" is a real assertion.
 */

import { describe, expect, it, vi } from "vitest";

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
  parentId: null,
  mediaId: null,
  editedAt: null,
  createdAt: new Date(),
  author: { id: AUTHOR, username: "ada", name: "Ada", avatarMediaId: null },
  _count: { replies: 0, likes: 0 },
  ...over,
});

const makeWorld = (ownerMediaId: number | null = null, ownerParentId: number | null = null) => {
  const created: { body: string; mediaId: number | null; client: unknown }[] = [];
  const deletedReplies: { parentId: number; client: unknown }[] = [];
  const deletedRepliesByTweet: { tweetId: number; client: unknown }[] = [];
  const updates: { id: number; data: { body?: string; mediaId?: number | null } }[] = [];
  const repo: ICommentRepository = {
    tweetExists: async () => true,
    findThread: async () => [],
    findReplies: async () => [],
    findParent: async () => null,
    commentExists: async () => true,
    createLike: async () => {},
    deleteLike: async () => {},
    getLikesCount: async () => 0,
    findById: async () => null,
    create: async (data, client) => {
      created.push({ body: data.body, mediaId: data.mediaId ?? null, client });
      return rawComment({ id: 1, body: data.body, mediaId: data.mediaId ?? null, parentId: data.parentId ?? null });
    },
    update: async (id, data) => {
      updates.push({ id, data });
      // As the real update does: `null` is written, only an omitted mediaId keeps the old one.
      const mediaId = data.mediaId === undefined ? ownerMediaId : data.mediaId;
      return rawComment({ id, body: data.body ?? "nice", mediaId });
    },
    delete: async (id, client) => {
      deletes.push({ id, client });
    },
    findOwner: async () => ({ authorId: AUTHOR, mediaId: ownerMediaId, parentId: ownerParentId, body: "nice" }),
    findReplyMediaRefs: async () => [],
    deleteRepliesOf: async (parentId, client) => {
      deletedReplies.push({ parentId, client });
      return 0;
    },
    deleteRepliesByTweet: async (tweetId, client) => {
      deletedRepliesByTweet.push({ tweetId, client });
      return 0;
    },
    findMediaRefsByTweet: async () => [],
    deleteByTweet: async (tweetId, client) => {
      deletedByTweet.push({ tweetId, client });
      return 0;
    },
  };

  const deletes: { id: number; client: unknown }[] = [];
  const deletedByTweet: { tweetId: number; client: unknown }[] = [];
  let opened = 0;
  const runInTransaction: RunInTransaction = async (fn) => {
    opened += 1;
    return fn(TX);
  };

  return { repo, created, updates, deletes, deletedByTweet, deletedReplies, deletedRepliesByTweet, runInTransaction, opened: () => opened };
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
        return { referenceId, token: token as never, contentType: "image/png", size: 1 };
      },
      authorizeAttachMany: async (inputs) =>
        inputs.map(({ token }) => {
          const referenceId = refs[token];
          if (referenceId === undefined) throw MediaAttachError.notAttachable();
          return { referenceId, token: token as never, contentType: "image/png", size: 1 };
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
    w.repo.findThread = async () => [
      rawComment({ id: 1, mediaId: 100 }),
      rawComment({ id: 2, mediaId: null }),
    ];
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const { data } = await svc.getThread(TWEET, { limit: 20 });

    expect(data[0]!.media).toEqual({ token: "tok-100" });
    expect(data[1]!.media).toBeNull();
    expect(resolveCalls).toBe(1); // batched — one query for the whole page
  });
});

describe("comment delete — coordination", () => {
  it("deletes a reply with no media directly, no transaction", async () => {
    const w = makeWorld(null, 9); // a reply — it can have no dependents of its own
    const { media, ended } = makeMedia({});
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    await svc.delete(1, AUTHOR);

    expect(w.opened()).toBe(0);
    expect(ended).toHaveLength(0);
    expect(w.deletes).toHaveLength(1);
  });

  it("opens a transaction for a top-level comment even with no media, because it may have replies", async () => {
    const w = makeWorld(null); // top-level
    const { media, ended } = makeMedia({});
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    await svc.delete(1, AUTHOR);

    // Whether this comment has replies is not knowable from its own row, and a
    // plain delete would meet the RESTRICT foreign key.
    expect(w.opened()).toBe(1);
    expect(ended).toHaveLength(0);
    expect(w.deletedReplies).toHaveLength(1);
    expect(w.deletes).toHaveLength(1);
  });

  it("ends the reference and deletes the row together, for a comment with media", async () => {
    const w = makeWorld(77); // has reference 77
    const { media, ended } = makeMedia({});
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    await svc.delete(1, AUTHOR);

    expect(ended).toEqual([{ mediaId: 77, referrer: "comment:1", client: TX }]);
    expect(w.deletes[0]).toMatchObject({ id: 1, client: TX }); // same transaction
  });

  it("deleteForTweet ends every comment's reference, then bulk-deletes — in the caller's transaction", async () => {
    const w = makeWorld();
    w.repo.findMediaRefsByTweet = async () => [
      { id: 10, mediaId: 100 },
      { id: 11, mediaId: 200 },
    ];
    const { media, ended } = makeMedia({});
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    await svc.deleteForTweet(TWEET, TX); // the use-case passes its own tx client

    expect(ended).toEqual([
      { mediaId: 100, referrer: "comment:10", client: TX },
      { mediaId: 200, referrer: "comment:11", client: TX },
    ]);
    expect(w.deletedByTweet).toEqual([{ tweetId: TWEET, client: TX }]);
  });
});

describe("comment responses — the author's avatar", () => {
  const AVATAR = 90;
  const withAvatar = (comment: CommentWithRelations): CommentWithRelations => ({
    ...comment,
    author: { ...comment.author, avatarMediaId: AVATAR },
  });

  /** A world whose repository answers with an author who has an avatar. */
  const makeAvatarWorld = (ownerMediaId: number | null = null) => {
    const w = makeWorld(ownerMediaId);
    const { create, update } = w.repo;
    w.repo.create = async (...args) => withAvatar(await create(...args));
    w.repo.update = async (...args) => withAvatar(await update(...args));
    return w;
  };

  /** A media port whose resolution records every batch it is asked for. */
  const recording = (refs: Record<string, number> = {}) => {
    const { media } = makeMedia(refs);
    const batches: number[][] = [];
    media.resolution.resolveTokens = async (ids) => {
      batches.push([...ids]);
      return new Map(ids.map((id) => [id, `tok-${id}` as never]));
    };
    return { media, batches };
  };

  it("a page resolves its media and its authors' avatars in one batch", async () => {
    const w = makeAvatarWorld();
    const { media, batches } = recording();
    w.repo.findThread = async () => [withAvatar(rawComment({ id: 1, mediaId: 100 })), rawComment({ id: 2 })];
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const { data } = await svc.getThread(TWEET, { limit: 20 });

    expect(data.map((comment) => comment.author.avatar)).toEqual([{ token: "tok-90" }, null]);
    expect(batches).toEqual([[100, AVATAR]]);
  });

  it("creating a comment answers with the author's avatar, with or without media", async () => {
    const w = makeAvatarWorld();
    const { media, batches } = recording({ tok: 55 });
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const plain = await svc.create(AUTHOR, TWEET, "nice");
    const attached = await svc.create(AUTHOR, TWEET, "nice", "tok");

    expect(plain.author.avatar).toEqual({ token: "tok-90" });
    expect(attached.author.avatar).toEqual({ token: "tok-90" });
    expect(attached.media).toEqual({ token: "tok" }); // the attach's own token is kept
    expect(batches).toEqual([[AVATAR], [AVATAR]]);
  });

  it("editing a comment answers with the author's avatar, on both edit paths", async () => {
    const w = makeAvatarWorld(44);
    const { media, batches } = recording({ tok: 55 });
    const svc = createCommentService(w.repo, media, w.runInTransaction);

    const bodyOnly = await svc.update(1, AUTHOR, { body: "edited" });
    const mediaEdit = await svc.update(1, AUTHOR, { media: { token: "tok" } });

    expect(bodyOnly.author.avatar).toEqual({ token: "tok-90" });
    expect(mediaEdit.author.avatar).toEqual({ token: "tok-90" });
    // The body-only edit resolves its existing media in the same batch as the avatar.
    expect(batches).toEqual([[44, AVATAR], [AVATAR]]);
  });

  it("an avatar that does not resolve is null, and nothing is logged", async () => {
    const w = makeAvatarWorld();
    const { media } = makeMedia({});
    media.resolution.resolveTokens = async () => new Map();
    w.repo.findThread = async () => [withAvatar(rawComment({ id: 1 }))];
    const svc = createCommentService(w.repo, media, w.runInTransaction);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const { data } = await svc.getThread(TWEET, { limit: 20 });
    const logged = errors.mock.calls.length;
    errors.mockRestore();

    expect(data[0]!.author.avatar).toBeNull();
    expect(logged).toBe(0);
  });
});
