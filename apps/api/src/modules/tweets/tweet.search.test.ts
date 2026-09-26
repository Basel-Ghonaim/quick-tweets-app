/**
 * Which search the service asks the repository for, and how it pages the answer.
 * What the database matches is proved in the integration lane.
 */

import { describe, expect, it } from "vitest";

import { createTweetService } from "./tweet.service";
import type { ITweetRepository, TweetWithRelations } from "./tweet.types";

const raw = (id: number): TweetWithRelations =>
  ({
    id,
    body: "a post",
    authorId: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    author: { id: 7, username: "ada", name: "Ada", avatarMediaId: null },
    _count: { likes: 0, comments: 0 },
    likes: [],
    media: [],
  }) as unknown as TweetWithRelations;

const makeWorld = (found: TweetWithRelations[] = []) => {
  const asked: { by: "hashtag" | "words"; value: string; cursor?: number; limit: number }[] = [];
  const repo = {
    findByHashtag: async (key: string, { cursor, limit }: { cursor?: number; limit: number }) => {
      asked.push({ by: "hashtag", value: key, cursor, limit });
      return found;
    },
    findByWords: async (query: string, { cursor, limit }: { cursor?: number; limit: number }) => {
      asked.push({ by: "words", value: query, cursor, limit });
      return found;
    },
  } as unknown as ITweetRepository;
  const media = { resolution: { resolveTokens: async () => new Map() } } as never;
  return { svc: createTweetService(repo, media), asked };
};

describe("which search is asked for", () => {
  it("finds a hashtag by its key, however it was spelled", async () => {
    const w = makeWorld();

    await w.svc.search("#WebDev", { limit: 10 });
    await w.svc.search("#أحمد", { limit: 10 });

    expect(w.asked.map(({ by, value }) => [by, value])).toEqual([
      ["hashtag", "webdev"],
      ["hashtag", "احمد"],
    ]);
  });

  it("searches words for any other query, as written", async () => {
    const w = makeWorld();

    await w.svc.search("tips for #WebDev", { limit: 10, cursor: 42 });

    expect(w.asked).toEqual([{ by: "words", value: "tips for #WebDev", cursor: 42, limit: 10 }]);
  });

  it("asks nothing for a hashtag with nothing left once normalised, since no post carries it", async () => {
    const w = makeWorld([raw(1)]);

    const { data, meta } = await w.svc.search(`#${String.fromCodePoint(0x0640)}`, { limit: 10 });

    expect(w.asked).toEqual([]);
    expect(data).toEqual([]);
    expect(meta).toEqual({ nextCursor: null, limit: 10, hasMore: false });
  });
});

describe("the page", () => {
  it("says there is more, and where to go on from, when one more than the page came back", async () => {
    const w = makeWorld([raw(9), raw(7), raw(4)]);

    const { data, meta } = await w.svc.search("coffee", { limit: 2 });

    expect(data.map((t) => t.id)).toEqual([9, 7]);
    expect(meta).toEqual({ nextCursor: "7", limit: 2, hasMore: true });
  });

  it("says there is no more on the last page", async () => {
    const w = makeWorld([raw(3)]);

    expect((await w.svc.search("coffee", { limit: 2 })).meta).toEqual({ nextCursor: null, limit: 2, hasMore: false });
  });
});
