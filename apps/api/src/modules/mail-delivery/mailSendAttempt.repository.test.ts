/**
 * The send-attempt repository, against a fake client.
 *
 * What a fake can prove is the *shape* of each query — which predicate is sent,
 * that a lock is taken before the count, and that nothing is written once the
 * cap is met. **Atomicity is not claimed here**: whether two concurrent
 * reservations can both succeed is a property of the database, and the
 * integration test against real Postgres is where it is established.
 */

import { describe, expect, it, vi } from "vitest";

import { createMailSendAttemptRepository } from "./mailSendAttempt.repository.js";

type CreateArg = { data: { recipientKey: string; outcome: string }; select?: unknown };
type WhereArg = { where: { recipientKey?: string; createdAt: Record<string, Date> } };
type UpdateArg = { where: { id: number }; data: { outcome: string } };

const fakeDb = (over: Partial<Record<string, unknown>> = {}) => {
  const db = {
    mailSendAttempt: {
      create: vi.fn(async (_arg: CreateArg) => ({ id: 99 })),
      count: vi.fn(async (_arg: WhereArg) => 0),
      update: vi.fn(async (_arg: UpdateArg) => ({})),
      deleteMany: vi.fn(async (_arg: WhereArg) => ({ count: 0 })),
      ...over,
    },
    $executeRaw: vi.fn(async () => 0),
    // The real client hands the callback a transactional client; the fake is
    // its own, which is all the shape assertions need.
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };
  return db;
};

const repoOver = (db: ReturnType<typeof fakeDb>) => createMailSendAttemptRepository(db as never);

const SINCE = new Date("2026-09-01T12:00:00.000Z");

describe("reserving a recipient's slot", () => {
  it("takes the recipient's lock before counting anything", async () => {
    const db = fakeDb();

    await repoOver(db).reserveForRecipient({ recipientKey: "abc123", since: SINCE, limit: 3 });

    expect(db.$executeRaw).toHaveBeenCalled();
    const lockOrder = db.$executeRaw.mock.invocationCallOrder[0]!;
    const countOrder = db.mailSendAttempt.count.mock.invocationCallOrder[0]!;
    expect(lockOrder).toBeLessThan(countOrder);
  });

  it("runs inside a transaction, so the lock has a scope to be released at", async () => {
    const db = fakeDb();

    await repoOver(db).reserveForRecipient({ recipientKey: "abc123", since: SINCE, limit: 3 });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("counts that recipient inside the window only", async () => {
    const db = fakeDb();

    await repoOver(db).reserveForRecipient({ recipientKey: "abc123", since: SINCE, limit: 3 });

    expect(db.mailSendAttempt.count).toHaveBeenCalledWith({
      where: { recipientKey: "abc123", createdAt: { gte: SINCE } },
    });
  });

  it("records the attempt and returns its id when the window has room", async () => {
    const db = fakeDb({ count: vi.fn(async (_arg: WhereArg) => 2) });

    const id = await repoOver(db).reserveForRecipient({
      recipientKey: "abc123",
      since: SINCE,
      limit: 3,
    });

    expect(id).toBe(99);
    expect(db.mailSendAttempt.create).toHaveBeenCalledTimes(1);
  });

  it("writes `unknown`, because at that moment nothing has been sent", async () => {
    const db = fakeDb();

    await repoOver(db).reserveForRecipient({ recipientKey: "abc123", since: SINCE, limit: 3 });

    const [[arg]] = db.mailSendAttempt.create.mock.calls;
    expect(arg.data).toEqual({ recipientKey: "abc123", outcome: "unknown" });
  });

  it("refuses at the limit, and writes nothing", async () => {
    const db = fakeDb({ count: vi.fn(async (_arg: WhereArg) => 3) });

    const id = await repoOver(db).reserveForRecipient({
      recipientKey: "abc123",
      since: SINCE,
      limit: 3,
    });

    expect(id).toBeNull();
    expect(db.mailSendAttempt.create).not.toHaveBeenCalled();
  });

  it("refuses past the limit too, rather than only exactly at it", async () => {
    const db = fakeDb({ count: vi.fn(async (_arg: WhereArg) => 9) });

    const id = await repoOver(db).reserveForRecipient({
      recipientKey: "abc123",
      since: SINCE,
      limit: 3,
    });

    expect(id).toBeNull();
  });
});

describe("correcting the outcome once the send answers", () => {
  it("updates the reserved row and nothing else", async () => {
    const db = fakeDb();

    await repoOver(db).setOutcome(99, "accepted");

    expect(db.mailSendAttempt.update).toHaveBeenCalledWith({
      where: { id: 99 },
      data: { outcome: "accepted" },
    });
  });
});

describe("the global window", () => {
  it("is the recipient question with the recipient dropped", async () => {
    const db = fakeDb({ count: vi.fn(async (_arg: WhereArg) => 41) });

    const count = await repoOver(db).countAll(SINCE);

    expect(count).toBe(41);
    expect(db.mailSendAttempt.count).toHaveBeenCalledWith({
      where: { createdAt: { gte: SINCE } },
    });
  });

  it("takes no lock — the ceiling is a breaker with headroom, not an exact quota", async () => {
    const db = fakeDb();

    await repoOver(db).countAll(SINCE);

    expect(db.$executeRaw).not.toHaveBeenCalled();
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
