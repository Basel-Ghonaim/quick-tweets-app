/**
 * Likes on a post — set and clear, and why neither is a toggle.
 *
 * The toggle these replace was not repeat-safe: with the like shown before the
 * server answers, a double press or a retry cancelled what the reader meant.
 * These cases are the proof that repeating either call is now a no-op.
 *
 * That the unique pair actually raises the conflict simulated here is the
 * database's to say, and is proved in the integration lane.
 */

import { describe, expect, it } from "vitest";

import type { AppError } from "../../shared/errors/index.js";
import type { RunInTransaction } from "../../shared/database/index.js";
import { createTweetService } from "./tweet.service";
import type { ITweetRepository } from "./tweet.types";

const READER = 7;
const TWEET = 3;

const prismaError = (code: string) => Object.assign(new Error(code), { code });

const makeWorld = () => {
  const state = {
    exists: true,
    likesCount: 0,
    createLikeError: null as unknown,
    deleteLikeError: null as unknown,
  };
  const calls = { created: 0, deleted: 0 };

  const repo = {
    findById: async () => (state.exists ? ({ id: TWEET } as never) : null),
    createLike: async () => {
      calls.created += 1;
      if (state.createLikeError) throw state.createLikeError;
    },
    deleteLike: async () => {
      calls.deleted += 1;
      if (state.deleteLikeError) throw state.deleteLikeError;
    },
    getLikesCount: async () => state.likesCount,
  } as unknown as ITweetRepository;

  const runInTransaction: RunInTransaction = async (fn) => fn({} as never);
  return { svc: createTweetService(repo, undefined, runInTransaction), state, calls };
};

const statusOf = async (run: Promise<unknown>): Promise<number> =>
  ((await run.catch((e: unknown) => e)) as AppError).statusCode;

describe("setLike", () => {
  it("answers the state the reader asked for, with the fresh count", async () => {
    const w = makeWorld();
    w.state.likesCount = 5;

    expect(await w.svc.setLike(READER, TWEET)).toEqual({ liked: true, likesCount: 5 });
  });

  it("is idempotent: the second press meets the unique pair and still reads liked", async () => {
    const w = makeWorld();

    await w.svc.setLike(READER, TWEET);
    w.state.createLikeError = prismaError("P2002");

    expect((await w.svc.setLike(READER, TWEET)).liked).toBe(true);
  });

  it("writes without reading first — the conflict is the mechanism, not a fallback", async () => {
    const w = makeWorld();

    await w.svc.setLike(READER, TWEET);

    // One write attempt, and no check-then-act window before it.
    expect(w.calls.created).toBe(1);
  });

  it("rethrows a failure that is not the expected conflict", async () => {
    const w = makeWorld();
    w.state.createLikeError = prismaError("P2003");

    await expect(w.svc.setLike(READER, TWEET)).rejects.toThrow();
  });

  it("404s a tweet that does not exist, without writing", async () => {
    const w = makeWorld();
    w.state.exists = false;

    expect(await statusOf(w.svc.setLike(READER, TWEET))).toBe(404);
    expect(w.calls.created).toBe(0);
  });
});

describe("clearLike", () => {
  it("answers not-liked, with the fresh count", async () => {
    const w = makeWorld();
    w.state.likesCount = 1;

    expect(await w.svc.clearLike(READER, TWEET)).toEqual({ liked: false, likesCount: 1 });
  });

  it("is idempotent: clearing a like that was already gone is not a refusal", async () => {
    const w = makeWorld();
    w.state.deleteLikeError = prismaError("P2025");

    expect(await w.svc.clearLike(READER, TWEET)).toEqual({ liked: false, likesCount: 0 });
  });

  it("rethrows a failure that is not the expected absence", async () => {
    const w = makeWorld();
    w.state.deleteLikeError = prismaError("P2003");

    await expect(w.svc.clearLike(READER, TWEET)).rejects.toThrow();
  });

  it("404s a tweet that does not exist, without writing", async () => {
    const w = makeWorld();
    w.state.exists = false;

    expect(await statusOf(w.svc.clearLike(READER, TWEET))).toBe(404);
    expect(w.calls.deleted).toBe(0);
  });
});

describe("what repeating a call cannot do", () => {
  it("never reverses the reader's intent, whichever call is repeated", async () => {
    const w = makeWorld();

    // The failure the toggle had: press, press again, end up unliked.
    await w.svc.setLike(READER, TWEET);
    w.state.createLikeError = prismaError("P2002");
    const afterDoublePress = await w.svc.setLike(READER, TWEET);

    w.state.deleteLikeError = prismaError("P2025");
    const afterDoubleClear = await w.svc.clearLike(READER, TWEET);

    expect(afterDoublePress.liked).toBe(true);
    expect(afterDoubleClear.liked).toBe(false);
  });
});
