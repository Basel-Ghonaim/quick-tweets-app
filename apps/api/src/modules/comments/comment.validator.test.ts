/**
 * Comment validators — what the schemas admit and what they refuse.
 *
 * The list query carries the one rule a validator can decide about the thread's
 * two levels: which list is being asked for. Whether the named parent exists,
 * sits on this tweet and is itself top-level needs the row, so it is the
 * service's, and is proved there.
 */

import { describe, expect, it } from "vitest";

import { commentQuerySchema, createCommentSchema } from "./comment.validator";

const issuesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((i) => i.message) ?? [];

describe("commentQuerySchema — which list is being asked for", () => {
  it("accepts a tweet on its own", () => {
    const parsed = commentQuerySchema.parse({ tweetId: "5" });
    expect(parsed).toEqual({ tweetId: 5, limit: 10 });
  });

  it("accepts a parent on its own", () => {
    const parsed = commentQuerySchema.parse({ parentId: "8" });
    expect(parsed).toEqual({ parentId: 8, limit: 10 });
  });

  it("refuses both together rather than arbitrating between them", () => {
    const result = commentQuerySchema.safeParse({ tweetId: "5", parentId: "8" });

    expect(result.success).toBe(false);
    expect(issuesOf(result)).toContain("Provide exactly one of tweetId or parentId");
  });

  it("refuses neither, which names no list at all", () => {
    const result = commentQuerySchema.safeParse({});

    expect(result.success).toBe(false);
    expect(issuesOf(result)).toContain("Provide exactly one of tweetId or parentId");
  });

  it("takes the shared cursor default rather than a comment-only one", () => {
    // 10, not the 20 the offset schema carried — comments no longer hold a
    // private pagination default.
    expect(commentQuerySchema.parse({ tweetId: "5" }).limit).toBe(10);
  });

  it("coerces the cursor and caps the page at 50", () => {
    expect(commentQuerySchema.parse({ tweetId: "5", cursor: "42", limit: "25" })).toEqual({
      tweetId: 5,
      cursor: 42,
      limit: 25,
    });
    expect(commentQuerySchema.safeParse({ tweetId: "5", limit: "51" }).success).toBe(false);
  });

  it("refuses an id that is not a positive integer", () => {
    expect(commentQuerySchema.safeParse({ tweetId: "0" }).success).toBe(false);
    expect(commentQuerySchema.safeParse({ parentId: "-1" }).success).toBe(false);
    expect(commentQuerySchema.safeParse({ parentId: "1.5" }).success).toBe(false);
  });
});

describe("createCommentSchema — answering a comment", () => {
  it("accepts a reply that names its parent", () => {
    expect(createCommentSchema.parse({ tweetId: 5, body: "hi", parentId: "8" })).toEqual({
      tweetId: 5,
      body: "hi",
      parentId: 8,
    });
  });

  it("leaves parentId absent for a top-level comment", () => {
    const parsed = createCommentSchema.parse({ tweetId: 5, body: "hi" });
    expect(parsed.parentId).toBeUndefined();
  });

  it("refuses a parent id that could never be a row", () => {
    expect(createCommentSchema.safeParse({ tweetId: 5, body: "hi", parentId: "0" }).success).toBe(
      false,
    );
  });
});
