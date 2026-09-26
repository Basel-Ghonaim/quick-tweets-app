/**
 * Tweet validators — that both body-bearing schemas apply the shared body rule, whose
 * proof sits beside `bodyTextField`, and what a search query may be.
 */

import { describe, expect, it } from "vitest";

import { createTweetSchema, feedQuerySchema, updateTweetSchema } from "./tweet.validator";

const bodyMessages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.error?.issues.filter((i) => i.path[0] === "body").map((i) => i.message) ?? [];

describe("createTweetSchema — the body rule", () => {
  it("refuses a direction control, and text made only of invisible characters", () => {
    expect(bodyMessages(createTweetSchema.safeParse({ body: "hi\u202E" }))).toEqual([
      "Tweet body cannot contain text-direction control characters",
    ]);
    expect(bodyMessages(createTweetSchema.safeParse({ body: "\u200B" }))).toEqual(["Tweet body cannot be empty"]);
  });

  it("accepts 280 characters of emoji, counting each once", () => {
    expect(createTweetSchema.safeParse({ body: "👍".repeat(280) }).success).toBe(true);
  });

  it("refuses a body of spaces rather than storing it empty", () => {
    expect(bodyMessages(createTweetSchema.safeParse({ body: "     " }))).toEqual(["Tweet body cannot be empty"]);
  });
});

const queryMessages = (query: Record<string, string>) =>
  feedQuerySchema.safeParse(query).error?.issues.filter((i) => i.path[0] === "q").map((i) => i.message) ?? [];

describe("feedQuerySchema — a search query", () => {
  it("takes a word query, trimmed and in NFC", () => {
    expect(feedQuerySchema.parse({ q: `  cafe${String.fromCodePoint(0x0301)} ` }).q).toBe("café");
  });

  it("refuses an empty query", () => {
    expect(queryMessages({ q: "   " })).toEqual(["Search query cannot be empty"]);
  });

  it("takes 100 characters, counting each emoji once, and refuses 101", () => {
    expect(feedQuerySchema.safeParse({ q: "👍".repeat(100) }).success).toBe(true);
    expect(queryMessages({ q: "a".repeat(101) })).toEqual(["Search query must be at most 100 characters"]);
  });

  it("takes a query that is one hashtag, and refuses one that begins with # and is not", () => {
    expect(feedQuerySchema.safeParse({ q: "#القراءة" }).success).toBe(true);
    for (const q of ["#WebDev tips", "#", "#one #two"]) {
      expect(queryMessages({ q })).toEqual(["A search that begins with # is one hashtag and nothing else"]);
    }
  });

  it("takes words with a hashtag among them, since only a leading # asks for a hashtag", () => {
    expect(feedQuerySchema.safeParse({ q: "tips for #WebDev" }).success).toBe(true);
  });

  it("refuses a search and an author together", () => {
    expect(queryMessages({ q: "coffee", author: "ada" })).toEqual(["Search all posts or one author's, not both"]);
  });
});

describe("updateTweetSchema — the body rule", () => {
  it("refuses a direction control, and text made only of invisible characters", () => {
    expect(bodyMessages(updateTweetSchema.safeParse({ body: "hi\u202E" }))).toEqual([
      "Tweet body cannot contain text-direction control characters",
    ]);
    expect(bodyMessages(updateTweetSchema.safeParse({ body: "\u200B" }))).toEqual(["Tweet body cannot be empty"]);
  });

  it("accepts 280 characters of emoji, counting each once", () => {
    expect(updateTweetSchema.safeParse({ body: "👍".repeat(280) }).success).toBe(true);
  });

  it("refuses a body of spaces rather than storing it empty", () => {
    expect(bodyMessages(updateTweetSchema.safeParse({ body: "     " }))).toEqual(["Tweet body cannot be empty"]);
  });
});
