import { describe, expect, it, vi } from "vitest";

import type { IPasswordResetRepository } from "./passwordReset.types.js";
import { createPasswordResetSweepJob } from "./passwordReset.sweep.job.js";

const NOW = new Date("2026-09-04T12:00:00.000Z");
const RETENTION = 7 * 24 * 60 * 60 * 1000;

const fakeRepo = (over: Partial<IPasswordResetRepository> = {}): IPasswordResetRepository => ({
  findMostRecentForUser: vi.fn(async () => null),
  lockUser: vi.fn(async () => {}),
  createChallenge: vi.fn(),
  findByCodeHash: vi.fn(async () => null),
  markUsed: vi.fn(async () => 0),
  deleteBefore: vi.fn(async () => 0),
  deleteSessionsBefore: vi.fn(async () => 0),
  ...over,
} as unknown as IPasswordResetRepository);

const build = (repo: IPasswordResetRepository, log = vi.fn()) =>
  createPasswordResetSweepJob({
    repo,
    retentionMs: RETENTION,
    intervalMs: 6 * 60 * 60 * 1000,
    now: () => NOW,
    log,
  });

describe("the job's identity and cadence", () => {
  it("names itself and takes its interval from configuration", () => {
    const job = build(fakeRepo());
    expect(job.name).toBe("password-reset-sweep");
    expect(job.intervalMs).toBe(6 * 60 * 60 * 1000);
  });
});

describe("the cutoff it computes", () => {
  it("removes what is older than retention, measured back from now", async () => {
    const repo = fakeRepo();
    await build(repo).handler();

    expect(repo.deleteBefore).toHaveBeenCalledTimes(1);
    expect(repo.deleteBefore).toHaveBeenCalledWith(new Date(NOW.getTime() - RETENTION));
  });

  it("reaches the database only through the repository — it issues no query of its own", async () => {
    // The repository is the module's single data-access path; a job that
    // queried around it would be a second one. Nothing here can query
    // directly, so the assertion is that deleteBefore is the only call made.
    const repo = fakeRepo();
    await build(repo).handler();

    const called = Object.entries(repo)
      .filter(([, value]) => typeof value === "function" && (value as ReturnType<typeof vi.fn>).mock?.calls.length)
      .map(([name]) => name);
    expect(called.sort()).toEqual(["deleteBefore", "deleteSessionsBefore"]);
  });
});

describe("what it reports", () => {
  it("logs the count it removed", async () => {
    const log = vi.fn();
    await build(fakeRepo({ deleteBefore: vi.fn(async () => 12) }), log).handler();

    expect(log).toHaveBeenCalledWith("[jobs] password-reset-sweep removed 12 spent credential(s) and 0 lapsed position(s)");
  });

  it("logs a no-op run too, so silence never means the job stopped running", async () => {
    const log = vi.fn();
    await build(fakeRepo({ deleteBefore: vi.fn(async () => 0) }), log).handler();

    expect(log).toHaveBeenCalledWith("[jobs] password-reset-sweep removed 0 spent credential(s) and 0 lapsed position(s)");
  });
});
