// Tweet DTO mapper — the media wire shape (ADR 0005 Decision 9 / M8).

import { describe, expect, it } from "vitest";

import { toTweetResponse } from "./tweet.mapper";
import type { TweetWithRelations } from "./tweet.types";

const rawTweet = (over: Partial<TweetWithRelations> = {}): TweetWithRelations => ({
  id: 1,
  body: "hello",
  authorId: 42,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: 42, username: "ada", name: "Ada", profileImage: null },
  _count: { likes: 2, comments: 1 },
  media: [],
  ...over,
});

describe("toTweetResponse — media", () => {
  it("exposes an empty collection when the tweet carries no media", () => {
    expect(toTweetResponse(rawTweet()).media).toEqual([]);
  });

  it("maps references to their resolved tokens, preserving stored order", () => {
    const tweet = rawTweet({
      media: [{ mediaId: 11, position: 0 }, { mediaId: 22, position: 1 }],
    });
    const tokens = new Map([[11, "tok-a"], [22, "tok-b"]]);

    expect(toTweetResponse(tweet, tokens).media).toEqual([
      { token: "tok-a" },
      { token: "tok-b" },
    ]);
  });

  it("omits a reference that did not resolve, rather than emitting a dead token", () => {
    // Media resolves servable objects only, so an unresolved reference would be
    // a token the client could never read.
    const tweet = rawTweet({
      media: [{ mediaId: 11, position: 0 }, { mediaId: 22, position: 1 }],
    });
    const tokens = new Map([[22, "tok-b"]]);

    expect(toTweetResponse(tweet, tokens).media).toEqual([{ token: "tok-b" }]);
  });

  it("no longer emits the retired image field", () => {
    expect(toTweetResponse(rawTweet())).not.toHaveProperty("image");
  });

  it("still maps the rest of the tweet", () => {
    const result = toTweetResponse(rawTweet({ _count: { likes: 2, comments: 1 }, likes: [{ userId: 7 }] }));

    expect(result).toMatchObject({
      id: 1,
      body: "hello",
      likesCount: 2,
      commentsCount: 1,
      isLiked: true,
    });
  });
});
