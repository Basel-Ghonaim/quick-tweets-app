/**
 * Repository unit tests — the queries it issues and the row → domain mapping,
 * exercised against a fake client rather than a database.
 */

import { describe, expect, it, vi } from "vitest";

import { createChannelVerificationRepository } from "./channelVerification.repository.js";

const RECORD_ROW = {
  id: 7,
  userId: 3,
  endpoint: "holder@example.test",
  provenAt: null,
  lastChallengedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const CHALLENGE_ROW = {
  id: 11,
  verificationId: 7,
  secretHash: "a".repeat(64),
  expiresAt: new Date("2026-01-01T01:00:00Z"),
  closedAt: null,
  closedReason: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

const fakeDb = () => ({
  channelVerification: {
    findUnique: vi.fn().mockResolvedValue(RECORD_ROW),
    create: vi.fn().mockResolvedValue(RECORD_ROW),
    update: vi.fn().mockResolvedValue(RECORD_ROW),
  },
  channelVerificationChallenge: {
    findFirst: vi.fn().mockResolvedValue(CHALLENGE_ROW),
    create: vi.fn().mockResolvedValue(CHALLENGE_ROW),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    update: vi.fn().mockResolvedValue(CHALLENGE_ROW),
    deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
  },
});

const repoOver = (db: ReturnType<typeof fakeDb>) =>
  createChannelVerificationRepository(db as never);

describe("finding the standing record", () => {
  it("looks it up by the (account, endpoint) pair, never by the account alone", async () => {
    const db = fakeDb();
    await repoOver(db).findRecord(3, "holder@example.test");

    expect(db.channelVerification.findUnique).toHaveBeenCalledWith({
      where: { userId_endpoint: { userId: 3, endpoint: "holder@example.test" } },
    });
  });

  it("maps the row to the domain shape", async () => {
    const record = await repoOver(fakeDb()).findRecord(
      3,
      "holder@example.test",
    );

    expect(record).toEqual({
      id: 7,
      userId: 3,
      endpoint: "holder@example.test",
      provenAt: null,
      lastChallengedAt: null,
      createdAt: RECORD_ROW.createdAt,
      updatedAt: RECORD_ROW.updatedAt,
    });
  });

  it("returns null when there is none", async () => {
    const db = fakeDb();
    db.channelVerification.findUnique.mockResolvedValue(null);

    await expect(
      repoOver(db).findRecord(3, "absent@example.test"),
    ).resolves.toBeNull();
  });
});

describe("the open challenge", () => {
  it("selects on the absence of a close, and does not filter by expiry", async () => {
    const db = fakeDb();
    await repoOver(db).findOpenChallenge(7);

    expect(db.channelVerificationChallenge.findFirst).toHaveBeenCalledWith({
      where: { verificationId: 7, closedAt: null },
    });
  });

  it("carries the stored digest, since the caller compares against it", async () => {
    const open = await repoOver(fakeDb()).findOpenChallenge(7);

    expect(open?.secretHash).toBe(CHALLENGE_ROW.secretHash);
    expect(open?.expiresAt).toEqual(CHALLENGE_ROW.expiresAt);
  });

  it("omits the digest from the shape returned on create", async () => {
    const challenge = await repoOver(fakeDb()).createChallenge({
      verificationId: 7,
      secretHash: CHALLENGE_ROW.secretHash,
      expiresAt: CHALLENGE_ROW.expiresAt,
    });

    expect(challenge).not.toHaveProperty("secretHash");
  });
});

describe("closing", () => {
  it("closes every open challenge for a record and reports how many", async () => {
    const db = fakeDb();
    const closedAt = new Date("2026-01-01T00:30:00Z");

    const count = await repoOver(db).closeOpenChallenges({
      verificationId: 7,
      closedAt,
      reason: "superseded",
    });

    expect(db.channelVerificationChallenge.updateMany).toHaveBeenCalledWith({
      where: { verificationId: 7, closedAt: null },
      data: { closedAt, closedReason: "superseded" },
    });
    expect(count).toBe(1);
  });

  it("closes one by id only while it is still open, and reports the rows matched", async () => {
    const db = fakeDb();
    const closedAt = new Date("2026-01-01T00:30:00Z");

    const closed = await repoOver(db).closeChallenge(11, closedAt, "verified");

    expect(db.channelVerificationChallenge.updateMany).toHaveBeenCalledWith({
      where: { id: 11, closedAt: null },
      data: { closedAt, closedReason: "verified" },
    });
    expect(closed).toBe(1);
    expect(db.channelVerificationChallenge.deleteMany).not.toHaveBeenCalled();
  });

  it("reports zero when the challenge was already closed", async () => {
    const db = fakeDb();
    db.channelVerificationChallenge.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repoOver(db).closeChallenge(11, new Date(), "verified"),
    ).resolves.toBe(0);
  });
});

describe("updating the record", () => {
  it("marks a proof without touching anything else", async () => {
    const db = fakeDb();
    const provenAt = new Date("2026-01-01T00:30:00Z");

    await repoOver(db).markProven({ verificationId: 7, provenAt });

    expect(db.channelVerification.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { provenAt },
    });
  });

  it("anchors the resend throttle on the record", async () => {
    const db = fakeDb();
    const at = new Date("2026-01-01T00:30:00Z");

    await repoOver(db).touchLastChallenged(7, at);

    expect(db.channelVerification.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { lastChallengedAt: at },
    });
  });
});

describe("the sweep's bulk delete", () => {
  it("removes closed or expired rows older than the cutoff, and reports the count", async () => {
    const db = fakeDb();
    const cutoff = new Date("2026-01-08T00:00:00Z");

    const removed = await repoOver(db).deleteSpentChallenges(cutoff);

    expect(db.channelVerificationChallenge.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ closedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }] },
    });
    expect(removed).toBe(4);
  });

  it("writes no status while removing", async () => {
    const db = fakeDb();

    await repoOver(db).deleteSpentChallenges(new Date());

    expect(db.channelVerificationChallenge.updateMany).not.toHaveBeenCalled();
    expect(db.channelVerification.update).not.toHaveBeenCalled();
  });
});

describe("the transaction client", () => {
  it("uses an injected client when given one, and its own otherwise", async () => {
    const db = fakeDb();
    const tx = fakeDb();
    const repo = repoOver(db);

    await repo.findRecord(3, "holder@example.test", tx as never);
    expect(tx.channelVerification.findUnique).toHaveBeenCalledTimes(1);
    expect(db.channelVerification.findUnique).not.toHaveBeenCalled();

    await repo.findRecord(3, "holder@example.test");
    expect(db.channelVerification.findUnique).toHaveBeenCalledTimes(1);
  });
});
