import { describe, expect, it, vi } from "vitest";

import { createChannelVerificationStatus } from "./channelVerification.status.js";
import { createChannelVerificationSweepJob } from "./channelVerification.sweep.job.js";
import type {
  IChannelVerificationRepository,
  OpenChallenge,
  VerificationRecord,
} from "./channelVerification.types.js";

const T0 = new Date("2026-01-01T12:00:00Z");
const RETENTION = 7 * 24 * 60 * 60 * 1000;

const spyRepo = (removed = 3) => {
  const calls: Date[] = [];
  const repo = {
    deleteSpentChallenges: vi.fn(async (cutoff: Date) => {
      calls.push(cutoff);
      return removed;
    }),
  } as unknown as IChannelVerificationRepository;
  return { repo, calls };
};

describe("the sweep", () => {
  it("removes anything spent before now minus the retention window", async () => {
    const { repo, calls } = spyRepo();
    const job = createChannelVerificationSweepJob({
      repo,
      retentionMs: RETENTION,
      now: () => T0,
      log: () => {},
    });

    await job.handler();

    expect(calls).toHaveLength(1);
    expect(calls[0]!.getTime()).toBe(T0.getTime() - RETENTION);
  });

  it("reports how many went", async () => {
    const lines: string[] = [];
    const job = createChannelVerificationSweepJob({
      repo: spyRepo(12).repo,
      retentionMs: RETENTION,
      now: () => T0,
      log: (m) => lines.push(m),
    });

    await job.handler();

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("12");
  });

  it("still says so when it removed nothing, so the job stays observable", async () => {
    const lines: string[] = [];
    const job = createChannelVerificationSweepJob({
      repo: spyRepo(0).repo,
      retentionMs: RETENTION,
      now: () => T0,
      log: (m) => lines.push(m),
    });

    await job.handler();

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("0");
  });

  it("registers under a stable name and the configured cadence", () => {
    const job = createChannelVerificationSweepJob({
      repo: spyRepo().repo,
      intervalMs: 1234,
    });

    expect(job.name).toBe("channel-verification-sweep");
    expect(job.intervalMs).toBe(1234);
  });

  it("touches one repository method — never the records that hold the proof", async () => {
    const touched: string[] = [];
    const repo = new Proxy({} as IChannelVerificationRepository, {
      get: (_t, property: string) => {
        touched.push(property);
        return async () => 0;
      },
    });

    await createChannelVerificationSweepJob({
      repo,
      retentionMs: RETENTION,
      now: () => T0,
      log: () => {},
    }).handler();

    expect(touched).toEqual(["deleteSpentChallenges"]);
  });
});

describe("the answer the system gives does not depend on the sweep", () => {
  /**
   * The claim that lets this job sit last: status is derived, so a lapsed
   * challenge reads the same whether the row is still there or already gone.
   * Proven by asking on both sides of a sweep rather than asserting it.
   */
  const record: VerificationRecord = {
    id: 1,
    userId: 3,
    endpoint: "holder@example.test",
    provenAt: null,
    lastChallengedAt: T0,
    createdAt: T0,
    updatedAt: T0,
  };

  const lapsed: OpenChallenge = {
    id: 11,
    verificationId: 1,
    secretHash: "a".repeat(64),
    // Long spent: expired, and never closed by anyone.
    expiresAt: new Date(T0.getTime() - 30 * 24 * 60 * 60 * 1000),
    closedAt: null,
    closedReason: null,
    createdAt: T0,
  };

  const world = () => {
    let challenges: OpenChallenge[] = [lapsed];
    const repo = {
      findRecords: async () => [record],
      findOpenChallenges: async () => challenges,
      deleteSpentChallenges: async (cutoff: Date) => {
        const before = challenges.length;
        challenges = challenges.filter(
          (c) => (c.closedAt ?? c.expiresAt).getTime() >= cutoff.getTime(),
        );
        return before - challenges.length;
      },
    } as unknown as IChannelVerificationRepository;

    return { repo, remaining: () => challenges.length };
  };

  it("reads the same before and after a sweep — and the sweep did do something", async () => {
    const { repo, remaining } = world();
    const status = createChannelVerificationStatus(repo, () => T0);

    const beforeSweep = await status.statusOf(3, "holder@example.test");
    expect(remaining()).toBe(1);

    await createChannelVerificationSweepJob({
      repo,
      retentionMs: RETENTION,
      now: () => T0,
      log: () => {},
    }).handler();

    // The row is genuinely gone — otherwise this proves nothing.
    expect(remaining()).toBe(0);

    const afterSweep = await status.statusOf(3, "holder@example.test");

    expect(beforeSweep).toBe("unproven");
    expect(afterSweep).toBe(beforeSweep);
  });

  it("leaves a proof untouched, so a swept challenge cannot un-verify an account", async () => {
    const proven = { ...record, provenAt: T0 };
    let challenges: OpenChallenge[] = [lapsed];
    const repo = {
      findRecords: async () => [proven],
      findOpenChallenges: async () => challenges,
      deleteSpentChallenges: async () => {
        challenges = [];
        return 1;
      },
    } as unknown as IChannelVerificationRepository;

    const status = createChannelVerificationStatus(repo, () => T0);
    const before = await status.statusOf(3, "holder@example.test");

    await createChannelVerificationSweepJob({
      repo,
      retentionMs: RETENTION,
      now: () => T0,
      log: () => {},
    }).handler();

    expect(before).toBe("proven");
    expect(await status.statusOf(3, "holder@example.test")).toBe("proven");
  });
});
