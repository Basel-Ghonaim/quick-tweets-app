// Refresh-token cleanup job — deletes expired tokens and reports the count (M10).

import { describe, expect, it, vi } from "vitest";

import { createRefreshTokenCleanupJob } from "./refreshTokenCleanup.job";
import type { ITokenRepository } from "./auth.types";

const stubRepo = (over: Partial<ITokenRepository> = {}): ITokenRepository => ({
  createRefreshToken: async () => ({}) as never,
  findRefreshToken: async () => null,
  deleteRefreshToken: async () => {},
  deleteAllUserTokens: async () => {},
  rotateRefreshToken: async () => ({}) as never,
  deleteExpired: async () => 0,
  ...over,
});

describe("refresh-token cleanup job", () => {
  it("names the job and carries an interval", () => {
    const job = createRefreshTokenCleanupJob({ repo: stubRepo(), intervalMs: 5000 });
    expect(job.name).toBe("refresh-token-cleanup");
    expect(job.intervalMs).toBe(5000);
  });

  it("deletes tokens expired as of the injected clock, and logs the count", async () => {
    const at = new Date("2026-07-23T00:00:00.000Z");
    const deleteExpired = vi.fn(async () => 3);
    const log = vi.fn();
    const job = createRefreshTokenCleanupJob({ repo: stubRepo({ deleteExpired }), now: () => at, log });

    await job.handler();

    expect(deleteExpired).toHaveBeenCalledWith(at);
    expect(log).toHaveBeenCalledWith("[jobs] refresh-token-cleanup removed 3 expired token(s)");
  });

  it("still reports a no-op run (observability)", async () => {
    const log = vi.fn();
    const job = createRefreshTokenCleanupJob({ repo: stubRepo({ deleteExpired: async () => 0 }), log });

    await job.handler();

    expect(log).toHaveBeenCalledWith("[jobs] refresh-token-cleanup removed 0 expired token(s)");
  });
});
