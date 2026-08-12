/**
 * deleteTweet use-case — cross-aggregate deletion orchestration.
 *
 * Proves the shape pinned for Comment Media: ownership asserted first and
 * in-transaction, dependents (comments) deleted before the tweet, everything on
 * the one sentinel client, and a whole-chain rollback on any failure.
 */

import { describe, expect, it } from "vitest";

import { AppError } from "../shared/errors/index.js";
import { createDeleteTweet, type DeleteTweetDeps } from "./deleteTweet";

const TX = { __tx: true } as never; // opaque sentinel for the transaction client
const AUTHOR = 7;

const makeDeps = (overrides: {
  assertOwner?: DeleteTweetDeps["tweets"]["assertOwner"];
  deleteWithMedia?: DeleteTweetDeps["tweets"]["deleteWithMedia"];
} = {}) => {
  const calls: { op: string; client: unknown }[] = [];
  let rolledBack = false;

  const deps: DeleteTweetDeps = {
    tweets: {
      assertOwner:
        overrides.assertOwner ??
        (async (id, userId, client) => {
          calls.push({ op: "assertOwner", client });
          if (userId !== AUTHOR) throw AppError.forbidden("You can only delete your own tweets");
        }),
      deleteWithMedia:
        overrides.deleteWithMedia ??
        (async (_id, client) => {
          calls.push({ op: "deleteWithMedia", client });
        }),
    },
    comments: {
      deleteForTweet: async (_tweetId, client) => {
        calls.push({ op: "deleteForTweet", client });
      },
    },
    runInTransaction: async (fn) => {
      try {
        return await fn(TX);
      } catch (e) {
        rolledBack = true;
        throw e;
      }
    },
  };

  return { deps, calls, rolledBack: () => rolledBack };
};

describe("deleteTweet use-case", () => {
  it("asserts ownership, deletes comments, then the tweet — in order, one transaction", async () => {
    const { deps, calls } = makeDeps();
    const deleteTweet = createDeleteTweet(deps);

    await deleteTweet(5, AUTHOR);

    expect(calls.map((c) => c.op)).toEqual(["assertOwner", "deleteForTweet", "deleteWithMedia"]);
    // Every step ran on the same transaction client.
    expect(calls.every((c) => c.client === TX)).toBe(true);
  });

  it("authorizes first — a non-owner deletes nothing and the transaction rolls back", async () => {
    const { deps, calls, rolledBack } = makeDeps();
    const deleteTweet = createDeleteTweet(deps);

    const err = await deleteTweet(5, 999).catch((e: unknown) => e);

    expect((err as AppError).statusCode).toBe(403);
    // Ownership is asserted before any deletion — nothing dependent ran.
    expect(calls.map((c) => c.op)).toEqual(["assertOwner"]);
    expect(rolledBack()).toBe(true);
  });

  it("rolls the whole chain back if the tweet deletion fails after comments are removed", async () => {
    const { deps, calls, rolledBack } = makeDeps({
      deleteWithMedia: async () => {
        throw new Error("boom");
      },
    });
    const deleteTweet = createDeleteTweet(deps);

    await deleteTweet(5, AUTHOR).catch(() => {});

    // Comments were deleted, then the tweet delete threw (the throwing override
    // records nothing) → the transaction that wraps both rolls it all back.
    expect(calls.map((c) => c.op)).toEqual(["assertOwner", "deleteForTweet"]);
    expect(rolledBack()).toBe(true);
  });
});
