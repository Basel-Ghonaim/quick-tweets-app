/**
 * The send-attempt repository, against a fake client.
 *
 * What a fake can prove is the shape of each query — which predicate is sent,
 * and that each window boundary falls where it is meant to. **Atomicity is not
 * claimed here**: whether concurrent attempts can exceed a cap is a property of
 * the database, and WI-5's integration test is where it is established.
 */

import { describe, expect, it, vi } from "vitest";

import { createMailSendAttemptRepository } from "./mailSendAttempt.repository.js";

/** Typed so a mock's recorded arguments read back without casts. */
type CreateArg = { data: { recipientKey: string; outcome: string } };
type WhereArg = { where: { recipientKey?: string; createdAt: Record<string, Date> } };

const fakeDb = (over: Partial<Record<string, unknown>> = {}) => ({
  mailSendAttempt: {
    create: vi.fn(async (_arg: CreateArg) => ({})),
    count: vi.fn(async (_arg: WhereArg) => 0),
    deleteMany: vi.fn(async (_arg: WhereArg) => ({ count: 0 })),
    ...over,
  },
});

const repoOver = (db: ReturnType<typeof fakeDb>) => createMailSendAttemptRepository(db as never);

const SINCE = new Date("2026-09-01T12:00:00.000Z");

describe("recording an attempt", () => {
  it("stores the key and the outcome, and nothing else", async () => {
    const db = fakeDb();

    await repoOver(db).record({ recipientKey: "abc123", outcome: "accepted" });

    expect(db.mailSendAttempt.create).toHaveBeenCalledWith({
      data: { recipientKey: "abc123", outcome: "accepted" },
    });
  });

  it("records a refusal and an unknown the same way — every attempt counts", async () => {
    const db = fakeDb();
    const repo = repoOver(db);

    await repo.record({ recipientKey: "abc123", outcome: "refused" });
    await repo.record({ recipientKey: "abc123", outcome: "unknown" });

    const outcomes = db.mailSendAttempt.create.mock.calls.map(([arg]) => arg.data.outcome);
    expect(outcomes).toEqual(["refused", "unknown"]);
  });
});

describe("the per-recipient window", () => {
  it("counts only that recipient, and only inside the window", async () => {
    const db = fakeDb({ count: vi.fn(async (_arg: WhereArg) => 3) });

    const count = await repoOver(db).countForRecipient("abc123", SINCE);

    expect(count).toBe(3);
    expect(db.mailSendAttempt.count).toHaveBeenCalledWith({
      where: { recipientKey: "abc123", createdAt: { gte: SINCE } },
    });
  });

  it("includes an attempt exactly at the boundary rather than dropping it", async () => {
    const db = fakeDb();

    await repoOver(db).countForRecipient("abc123", SINCE);

    const [[arg]] = db.mailSendAttempt.count.mock.calls;
    expect(arg.where.createdAt).toEqual({ gte: SINCE });
  });
});

describe("the global window", () => {
  it("is the same question with the recipient dropped", async () => {
    const db = fakeDb({ count: vi.fn(async (_arg: WhereArg) => 41) });

    const count = await repoOver(db).countAll(SINCE);

    expect(count).toBe(41);
    expect(db.mailSendAttempt.count).toHaveBeenCalledWith({
      where: { createdAt: { gte: SINCE } },
    });
  });
});

describe("pruning", () => {
  it("removes only what is strictly older than the cutoff", async () => {
    const db = fakeDb({ deleteMany: vi.fn(async (_arg: WhereArg) => ({ count: 7 })) });

    const removed = await repoOver(db).deleteBefore(SINCE);

    expect(removed).toBe(7);
    expect(db.mailSendAttempt.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: SINCE } },
    });
  });

  it("leaves an attempt exactly at the cutoff alone, so a window never loses its edge", async () => {
    const db = fakeDb();

    await repoOver(db).deleteBefore(SINCE);

    const [[arg]] = db.mailSendAttempt.deleteMany.mock.calls;
    expect(arg.where.createdAt).toEqual({ lt: SINCE });
  });
});

describe("the repository reaches nothing but its own table", () => {
  it("touches no consumer's model", async () => {
    const db = fakeDb();
    const repo = repoOver(db);

    await repo.record({ recipientKey: "abc123", outcome: "accepted" });
    await repo.countForRecipient("abc123", SINCE);
    await repo.countAll(SINCE);
    await repo.deleteBefore(SINCE);

    // A consumer model reached through this fake would be undefined and throw,
    // so it could not pass unnoticed.
    expect(Object.keys(db)).toEqual(["mailSendAttempt"]);
  });
});
