import { describe, expect, it, vi } from "vitest";

import { createChannelVerificationStatus } from "./channelVerification.status.js";
import type {
  IChannelVerificationRepository,
  OpenChallenge,
  VerificationRecord,
} from "./channelVerification.types.js";

const T0 = new Date("2026-01-01T12:00:00Z");

const record = (over: Partial<VerificationRecord> = {}): VerificationRecord => ({
  id: 1,
  userId: 3,
  endpoint: "holder@example.test",
  provenAt: null,
  lastChallengedAt: null,
  createdAt: T0,
  updatedAt: T0,
  ...over,
});

const challenge = (over: Partial<OpenChallenge> = {}): OpenChallenge => ({
  id: 11,
  verificationId: 1,
  secretHash: "a".repeat(64),
  expiresAt: new Date(T0.getTime() + 60_000),
  closedAt: null,
  closedReason: null,
  createdAt: T0,
  ...over,
});

const build = (records: VerificationRecord[], open: OpenChallenge[] = []) => {
  const repo = {
    findRecords: vi.fn(async () => records),
    findOpenChallenges: vi.fn(async () => open),
  } as unknown as IChannelVerificationRepository;

  return { repo, status: createChannelVerificationStatus(repo, () => T0) };
};

describe("deriving a status", () => {
  it("is unproven when no record exists for that exact subject", async () => {
    const { status } = build([]);

    await expect(status.statusOf(3, "holder@example.test")).resolves.toBe("unproven");
  });

  it("is proven once a proof is recorded", async () => {
    const { status } = build([record({ provenAt: T0 })]);

    await expect(status.statusOf(3, "holder@example.test")).resolves.toBe("proven");
  });

  it("is pending while a challenge is open and unexpired", async () => {
    const { status } = build([record()], [challenge()]);

    await expect(status.statusOf(3, "holder@example.test")).resolves.toBe("pending");
  });

  it("falls back to unproven when the open challenge has lapsed", async () => {
    const lapsed = challenge({ expiresAt: new Date(T0.getTime() - 1) });
    const { status } = build([record()], [lapsed]);

    await expect(status.statusOf(3, "holder@example.test")).resolves.toBe("unproven");
  });

  it("treats a different endpoint as a different subject", async () => {
    const { status } = build([record({ provenAt: T0 })]);

    await expect(status.statusOf(3, "renamed@example.test")).resolves.toBe("unproven");
  });

  it("writes nothing — the repository is only ever read", async () => {
    const { repo, status } = build([record()], [challenge()]);

    await status.statusOf(3, "holder@example.test");

    for (const method of Object.keys(repo)) {
      expect(method.startsWith("find")).toBe(true);
    }
  });
});

describe("asking about many subjects", () => {
  const subjects = [
    { userId: 3, endpoint: "a@example.test" },
    { userId: 4, endpoint: "b@example.test" },
    { userId: 5, endpoint: "c@example.test" },
  ];

  it("answers in the order asked, not the order the database returned", async () => {
    // Deliberately reversed relative to `subjects`.
    const rows = [
      record({ id: 3, userId: 5, endpoint: "c@example.test", provenAt: T0 }),
      record({ id: 1, userId: 3, endpoint: "a@example.test" }),
    ];
    const { status } = build(rows, [challenge({ verificationId: 1 })]);

    await expect(status.statusOfMany(subjects)).resolves.toEqual([
      "pending",
      "unproven",
      "proven",
    ]);
  });

  it("uses a fixed number of queries however many subjects are asked about", async () => {
    const { repo, status } = build([record()], [challenge()]);

    await status.statusOfMany(subjects);

    expect(repo.findRecords).toHaveBeenCalledTimes(1);
    expect(repo.findOpenChallenges).toHaveBeenCalledTimes(1);
  });

  it("asks for challenges only for records that could still be pending", async () => {
    const rows = [
      record({ id: 1, userId: 3, endpoint: "a@example.test" }),
      record({ id: 2, userId: 4, endpoint: "b@example.test", provenAt: T0 }),
    ];
    const { repo, status } = build(rows);

    await status.statusOfMany(subjects);

    expect(repo.findOpenChallenges).toHaveBeenCalledWith([1], undefined);
  });

  it("touches the database for nothing when asked about nothing", async () => {
    const { repo, status } = build([]);

    await expect(status.statusOfMany([])).resolves.toEqual([]);

    expect(repo.findRecords).not.toHaveBeenCalled();
    expect(repo.findOpenChallenges).not.toHaveBeenCalled();
  });

  it("passes a transaction client through to both reads", async () => {
    const tx = { __tx: true } as never;
    const { repo, status } = build([record()], [challenge()]);

    await status.statusOf(3, "holder@example.test", tx);

    expect(repo.findRecords).toHaveBeenCalledWith(
      [{ userId: 3, endpoint: "holder@example.test" }],
      tx,
    );
    expect(repo.findOpenChallenges).toHaveBeenCalledWith([1], tx);
  });
});

const COOLDOWN = 60_000;

const buildState = (found: VerificationRecord | null, open: OpenChallenge | null = null) => {
  const repo = {
    findRecord: vi.fn(async () => found),
    findOpenChallenge: vi.fn(async () => open),
  } as unknown as IChannelVerificationRepository;

  return { repo, status: createChannelVerificationStatus(repo, () => T0, COOLDOWN) };
};

describe("reading a subject's whole state", () => {
  it("reports no wait when the subject has never been challenged", async () => {
    const { status } = buildState(record());

    await expect(status.stateOf(3, "holder@example.test")).resolves.toEqual({
      status: "unproven",
      resendAvailableInSeconds: 0,
    });
  });

  it("reports what remains of the window, rounded up", async () => {
    // Forty and a half seconds in: nineteen and a half remain, and a caller
    // told twenty and waiting twenty is past the window rather than short of it.
    const record40s = record({ lastChallengedAt: new Date(T0.getTime() - 40_500) });
    const { status } = buildState(record40s, challenge());

    await expect(status.stateOf(3, "holder@example.test")).resolves.toEqual({
      status: "pending",
      resendAvailableInSeconds: 20,
    });
  });

  it("reports no wait once the window has passed", async () => {
    const lapsed = record({ lastChallengedAt: new Date(T0.getTime() - COOLDOWN - 1) });
    const { status } = buildState(lapsed, challenge());

    await expect(status.stateOf(3, "holder@example.test")).resolves.toEqual({
      status: "pending",
      resendAvailableInSeconds: 0,
    });
  });

  it("answers for a subject nothing is on record for", async () => {
    const { status } = buildState(null);

    await expect(status.stateOf(3, "holder@example.test")).resolves.toEqual({
      status: "unproven",
      resendAvailableInSeconds: 0,
    });
  });

  it("is proven once a proof is recorded, and still answers the window it is in", async () => {
    const proven = record({ provenAt: T0, lastChallengedAt: new Date(T0.getTime() - 30_000) });
    const { status } = buildState(proven);

    await expect(status.stateOf(3, "holder@example.test")).resolves.toEqual({
      status: "proven",
      resendAvailableInSeconds: 30,
    });
  });

  it("falls back to unproven when the open challenge has lapsed", async () => {
    const lapsed = challenge({ expiresAt: new Date(T0.getTime() - 1) });
    const { status } = buildState(record({ lastChallengedAt: T0 }), lapsed);

    await expect(status.stateOf(3, "holder@example.test")).resolves.toEqual({
      status: "unproven",
      resendAvailableInSeconds: 60,
    });
  });

  it("asks for a challenge only when the record could still be pending", async () => {
    const { repo, status } = buildState(record({ provenAt: T0 }));

    await status.stateOf(3, "holder@example.test");

    expect(repo.findOpenChallenge).not.toHaveBeenCalled();
  });

  it("writes nothing — the repository is only ever read", async () => {
    const { repo, status } = buildState(record(), challenge());

    await status.stateOf(3, "holder@example.test");

    for (const method of Object.keys(repo)) {
      expect(method.startsWith("find")).toBe(true);
    }
  });

  it("passes a transaction client through to both reads", async () => {
    const tx = { __tx: true } as never;
    const { repo, status } = buildState(record(), challenge());

    await status.stateOf(3, "holder@example.test", tx);

    expect(repo.findRecord).toHaveBeenCalledWith(3, "holder@example.test", tx);
    expect(repo.findOpenChallenge).toHaveBeenCalledWith(1, tx);
  });
});
