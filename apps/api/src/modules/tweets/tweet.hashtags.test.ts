/**
 * Which hashtags the service hands the repository with a post. That the database keeps them,
 * replaces them and drops them with the post is proved in the integration lane.
 */

import { describe, expect, it } from "vitest";

import type { RunInTransaction } from "../../shared/database/index.js";
import type { Hashtag } from "../../shared/hashtags/index.js";
import { createTweetService } from "./tweet.service";
import type { ITweetRepository, TweetWithRelations } from "./tweet.types";

const AUTHOR = 7;
const TWEET = 3;

const raw = (): TweetWithRelations =>
  ({
    id: TWEET,
    body: "stored #Old",
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
  const created: Hashtag[][] = [];
  const updates: { body?: string; hashtags?: Hashtag[] }[] = [];

  const repo = {
    create: async (_author: number, _body: string, hashtags: Hashtag[]) => {
      created.push(hashtags);
      return raw();
    },
    update: async (_id: number, data: { body?: string; hashtags?: Hashtag[] }) => {
      updates.push(data);
      return raw();
    },
    findOwner: async () => ({ authorId: AUTHOR, body: "stored #Old" }),
    findMediaRefs: async () => [],
    replaceMediaRefs: async () => {},
  } as unknown as ITweetRepository;

  const media = {
    ownership: { authorizeAttachMany: async () => [{ referenceId: 11 }] },
    references: { referenceBegan: async () => {}, referenceEnded: async () => {} },
    resolution: { resolveTokens: async () => new Map() },
  } as never;

  const runInTransaction: RunInTransaction = async (fn) => fn({} as never);
  return { svc: createTweetService(repo, media, runInTransaction), created, updates };
};

describe("a new post carries the hashtags of its text", () => {
  it("hands them over with the post", async () => {
    const w = makeWorld();

    await w.svc.create(AUTHOR, "Reading #WebDev and #القراءة, again #webdev");

    expect(w.created).toEqual([
      [
        { key: "webdev", spelling: "WebDev" },
        { key: "القراءة", spelling: "القراءة" },
      ],
    ]);
  });

  it("hands them over when the post carries images too", async () => {
    const w = makeWorld();

    await w.svc.create(AUTHOR, "with a picture #Photo", ["tok"]);

    expect(w.created).toEqual([[{ key: "photo", spelling: "Photo" }]]);
  });

  it("hands over none for text without hashtags, rather than leaving them out", async () => {
    const w = makeWorld();

    await w.svc.create(AUTHOR, "no tags here, only https://example.com/#top");

    expect(w.created).toEqual([[]]);
  });
});

describe("the hashtags follow the text", () => {
  it("replaces them when the text is edited", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { body: "now #New" });

    expect(w.updates[0]).toMatchObject({ body: "now #New", hashtags: [{ key: "new", spelling: "New" }] });
  });

  it("replaces them when the text changes together with the images", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { body: "now #New", media: [] });

    expect(w.updates[0]).toMatchObject({ hashtags: [{ key: "new", spelling: "New" }] });
  });

  it("empties them when the edited text has none", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { body: "plain now" });

    expect(w.updates[0]).toMatchObject({ hashtags: [] });
  });

  it("leaves them alone when only the images change", async () => {
    const w = makeWorld();

    await w.svc.update(TWEET, AUTHOR, { media: [] });

    expect(w.updates[0]).not.toHaveProperty("hashtags");
  });
});
