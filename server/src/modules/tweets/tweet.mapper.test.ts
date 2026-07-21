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
  ...over,
});

describe("toTweetResponse — media", () => {
  it("exposes an ordered media collection, empty until a write path exists", () => {
    expect(toTweetResponse(rawTweet()).media).toEqual([]);
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
