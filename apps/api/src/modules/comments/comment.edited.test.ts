/**
 * What counts as an edit to a comment — the same rule posts carry.
 *
 * It is written out here rather than shared, so this file is the check that the
 * two have not drifted: if a later change makes an image an edit on one side
 * only, one of these two suites fails and the other does not.
 */

import { describe, expect, it } from "vitest";

import type { RunInTransaction } from "../../shared/database/index.js";
import { createCommentService, type CommentMediaPort } from "./comment.service";
import type { CommentWithRelations, ICommentRepository } from "./comment.types";

const AUTHOR = 7;
const COMMENT = 11;
const STORED = "the stored text";

const raw = (): CommentWithRelations =>
  ({
    id: COMMENT,
    body: STORED,
    authorId: AUTHOR,
    tweetId: 3,
    parentId: null,
    mediaId: null,
    editedAt: null,
    createdAt: new Date(),
    author: { id: AUTHOR, username: "ada", name: "Ada", avatarMediaId: null },
    _count: { replies: 0, likes: 0 },
  }) as unknown as CommentWithRelations;

const makeWorld = (storedMediaId: number | null = null) => {
  const writes: { body?: string; mediaId?: number | null; editedAt?: Date }[] = [];

  const repo = {
    findOwner: async () => ({
      authorId: AUTHOR,
      mediaId: storedMediaId,
      parentId: null,
      body: STORED,
    }),
    update: async (_id: number, data: { body?: string; editedAt?: Date }) => {
      writes.push(data);
      return raw();
    },
  } as unknown as ICommentRepository;

  const media: CommentMediaPort = {
    ownership: {
      authorizeAttach: async () => ({ referenceId: 99, token: "tok" }) as never,
      authorizeAttachMany: async () => [],
      usageFor: async () => ({}) as never,
    },
    references: {
      referenceBegan: async () => {},
      referenceEnded: async () => {},
      isReferenced: async () => false,
    },
    resolution: { resolveTokens: async () => new Map(), resolveToken: async () => null },
  };

  const runInTransaction: RunInTransaction = async (fn) => fn({} as never);
  return { svc: createCommentService(repo, media, runInTransaction), writes };
};

const marked = (writes: { editedAt?: Date }[]) =>
  writes.length > 0 && writes[writes.length - 1]!.editedAt instanceof Date;

describe("a change to the text is an edit", () => {
  it("marks a body that differs from the stored one", async () => {
    const w = makeWorld();

    await w.svc.update(COMMENT, AUTHOR, { body: "something else" });

    expect(marked(w.writes)).toBe(true);
  });

  it("marks a text change that arrives together with an image change", async () => {
    const w = makeWorld();

    await w.svc.update(COMMENT, AUTHOR, { body: "something else", media: { token: "tok" } });

    expect(marked(w.writes)).toBe(true);
  });
});

describe("what is not an edit", () => {
  it("does not mark a body identical to the stored one", async () => {
    const w = makeWorld();

    await w.svc.update(COMMENT, AUTHOR, { body: STORED });

    expect(marked(w.writes)).toBe(false);
  });

  it("does not mark attaching an image on its own", async () => {
    const w = makeWorld();

    await w.svc.update(COMMENT, AUTHOR, { media: { token: "tok" } });

    expect(marked(w.writes)).toBe(false);
  });

  it("does not mark removing the image on its own", async () => {
    const w = makeWorld(42);

    await w.svc.update(COMMENT, AUTHOR, { media: null });

    expect(marked(w.writes)).toBe(false);
  });
});

describe("the marker is never taken back", () => {
  it("leaves the column untouched rather than writing null", async () => {
    const w = makeWorld(42);

    await w.svc.update(COMMENT, AUTHOR, { media: null });

    expect(w.writes[0]).not.toHaveProperty("editedAt");
  });
});
