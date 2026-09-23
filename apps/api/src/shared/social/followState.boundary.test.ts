/**
 * The boundary that keeps follow state off the shapes that do not want it.
 *
 * `AuthorEmbed` is built by three modules — tweets, comments and the follow
 * lists. Only a post's author draws a Follow button; a comment's author draws
 * the owner's menu and nothing else. So the two fields ride a *widened* author
 * on the tweet response, and the shared type stays as it was.
 *
 * That is an intention until something checks it. Nothing in the type system
 * prevents a later change from moving the fields onto `AuthorEmbed`, where they
 * would silently appear on every comment in every thread and cost a resolution
 * per page that nothing renders. These cases are that check.
 */

import { describe, expect, it } from "vitest";

import { toAuthorEmbed } from "../utils/index.js";
import { toTweetResponse } from "../../modules/tweets/tweet.mapper";
import type { TweetWithRelations } from "../../modules/tweets/tweet.types";

const author = { id: 42, username: "ada", name: "Ada", avatarMediaId: null };

const rawTweet = (): TweetWithRelations =>
  ({
    id: 1,
    body: "hello",
    authorId: 42,
    author,
    media: [],
    _count: { likes: 0, comments: 0 },
    likes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as TweetWithRelations;

describe("follow state rides the tweet's author, not the shared embed", () => {
  it("the shared AuthorEmbed carries neither direction", () => {
    const embed = toAuthorEmbed(author, new Map());

    // A comment's author and a follow-list row are both built from this.
    expect(embed).not.toHaveProperty("isFollowing");
    expect(embed).not.toHaveProperty("followsYou");
    expect(Object.keys(embed).sort()).toEqual(["avatar", "id", "name", "username"]);
  });

  it("a post's author carries both, and is the only author that does", () => {
    const response = toTweetResponse(rawTweet(), new Map(), {
      isFollowing: true,
      followsYou: true,
    });

    expect(response.author).toHaveProperty("isFollowing", true);
    expect(response.author).toHaveProperty("followsYou", true);
    // The widening is on the tweet's copy alone; the shared builder is untouched.
    expect(toAuthorEmbed(author, new Map())).not.toHaveProperty("isFollowing");
  });
});
