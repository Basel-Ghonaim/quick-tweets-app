/**
 * The spent-attempt sweep, against a stubbed repository and an injected clock.
 */

import { describe, expect, it, vi } from "vitest";

import { createMailSendAttemptSweepJob } from "./mailSendAttempt.sweep.job.js";
import type { IMailSendAttemptRepository } from "./mailSendAttempt.repository.js";

const NOW = new Date("2026-09-01T12:00:00.000Z");
const RETENTION = 7 * 24 * 60 * 60 * 1000;

const fakeRepo = (over: Partial<IMailSendAttemptRepository> = {}): IMailSendAttemptRepository => ({
  reserveForRecipient: vi.fn(async () => 1),
  setOutcome: vi.fn(async () => {}),
  countAll: vi.fn(async () => 0),
  deleteBefore: vi.fn(async () => 0),
  ...over,
});

const build = (repo: IMailSendAttemptRepository, log: (m: string) => void = () => {}) =>
  createMailSendAttemptSweepJob({ repo, retentionMs: RETENTION, now: () => NOW, log });

describe("the job the scheduler is handed", () => {
  it("is named, so its lock and its log line identify it", () => {
    expect(build(fakeRepo()).name).toBe("mail-send-attempt-sweep");
  });

  it("takes its interval from configuration", () => {
    const job = createMailSendAttemptSweepJob({ repo: fakeRepo(), intervalMs: 1234 });

    expect(job.intervalMs).toBe(1234);
  });
});

describe("what a run removes", () => {
  it("deletes by a cutoff one retention period behind the clock", async () => {
    const repo = fakeRepo();

    await build(repo).handler();

    expect(repo.deleteBefore).toHaveBeenCalledWith(new Date(NOW.getTime() - RETENTION));
  });

  it("reaches the database only through the repository", async () => {
    const repo = fakeRepo();

    await build(repo).handler();

    // The only call it makes is the one the repository declares for it.
    expect(repo.deleteBefore).toHaveBeenCalledTimes(1);
    expect(repo.countAll).not.toHaveBeenCalled();
    expect(repo.reserveForRecipient).not.toHaveBeenCalled();
  });
});

describe("it stays observable", () => {
  it("logs how many went", async () => {
    const lines: string[] = [];
    const repo = fakeRepo({ deleteBefore: vi.fn(async () => 12) });

    await build(repo, (m) => lines.push(m)).handler();

    expect(lines[0]).toContain("12");
  });

  it("logs a run that removed nothing, rather than falling silent", async () => {
    const lines: string[] = [];

    await build(fakeRepo(), (m) => lines.push(m)).handler();

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("0");
  });
});
