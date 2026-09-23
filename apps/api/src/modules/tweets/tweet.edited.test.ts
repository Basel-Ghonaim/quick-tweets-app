/**
 * What counts as an edit to a post, and — more importantly — what does not.
 *
 * The rule is narrow on purpose: **the text, and only the text.** An image
 * added, replaced, removed or reordered is not an edit, and neither is
 * re-submitting the same words. Both of those are easy to lose later, so each
 * has a case named for it rather than being left implied by the happy path.
 *
 * That `updatedAt` moves while `editedAt` does not — the whole reason the column
 * exists — is the database's to say, and is proved in the integration lane.
 */

import { describe, expect, it } from "vitest";

import type { RunInTransaction } from "../../shared/database/index.js";
import { createTweetService } from "./tweet.service";
import type { ITweetRepository, TweetWithRelations } from "./tweet.types";

const AUTHOR = 7;
const TWEET = 3;
const STORED = "the stored text";

const raw = (): TweetWithRelations =>
  ({
    id: TWEET,
    body: STORED,
    authorId: AUTHOR,
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    author: { id: AUTHOR, username: "ada", name: "Ada", avatarMediaId: null },
    _count: { likes: 0, comments: 0 },
    likes: [],
    media: [],
  }) as unknown as TweetWithRelations;

const makeWorld = () => {
  /** Every `data` object the service hands the repository. */
  const writes: { body?: string; editedAt?: Date }[] = [];

  const repo = {
    findOwner: async () => ({ authorId: AUTHOR, body: STORED }),
    update: async (_id: number, data: { body?: string; editedAt?: Date }) => {
      writes.push(data);
      return raw();
    },
    findById: async () => raw(),
    findMediaRefs: async () => [],
    replaceMediaRefs: async () => {},
  } as unknown as ITweetRepository;

  const media = {
    ownership: { authorizeAttachMany: async () => [], authorizeAttach: async () => ({}) as never, usageFor: async () => ({}) as never },
    references: { referenceBegan: async () => {}, referenceEnded: async () => {}, isReferenced: async () => false },
    resolution: { resolveTokens: async () => new Map(), resolveToken: async () => null },
  } as never;

  const runInTransaction: RunInTransaction = async (fn) => fn({} as never);
  return { svc: createTweetService(repo, media, runInTransaction), writes };
};

/** Did the write that reached the repository carry an edit marker? */
const marked = (writes: { editedAt?: Date }[]) =>
  writes.length > 0 && writes[writes.length - 1]!.editedAt instanceof Date;

describe("a change to the text is an edit", () => {
  it("marks a body that differs from the stored one", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { body: "something else" });

    expect(marked(w.writes)).toBe(true);
  });

  it("marks a text change that arrives together with a media change", async () => {
    const w = makeWorld();

    // The combined edit goes down the transaction path, which is exactly where a
    // rule computed per-branch would be forgotten.
    await w.svc.update(TWEET, AUTHOR, { body: "something else", media: [] });

    expect(marked(w.writes)).toBe(true);
  });
});

describe("what is not an edit", () => {
  it("does not mark a body that is identical to the stored one", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { body: STORED });

    // Nothing a reader sees has changed, so nothing is announced.
    expect(marked(w.writes)).toBe(false);
  });

  it("does not mark an edit that only changes the images", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { media: [] });

    // The decision this Work Item was narrowed to: images are not text.
    expect(marked(w.writes)).toBe(false);
  });

  it("does not mark an edit that submits no body at all", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { media: ["tok"] });

    expect(marked(w.writes)).toBe(false);
  });
});

describe("the marker is never taken back", () => {
  it("leaves the column untouched rather than writing null", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { media: [] });

    // `editedAt` absent from the write, not `editedAt: null` — a post edited
    // last week must not become unedited because its images changed today.
    expect(w.writes[0]).not.toHaveProperty("editedAt");
  });
});
