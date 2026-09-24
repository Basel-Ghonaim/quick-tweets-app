/**
 * Tweet validators — that both body-bearing schemas apply the shared body rule.
 * The rule itself is proved once, beside `bodyTextField`.
 */

import { describe, expect, it } from "vitest";

import { createTweetSchema, updateTweetSchema } from "./tweet.validator";

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
