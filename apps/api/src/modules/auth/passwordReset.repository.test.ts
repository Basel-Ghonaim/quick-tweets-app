/**
 * The reset credential repository, against a fake client.
 *
 * What a fake can prove is the *shape* of each query — which predicate is
 * sent, and that a write is conditional where it must be. **Atomicity is not
 * claimed here**: whether concurrent requests for one user genuinely
 * serialise is a property of the database, established separately against
 * real Postgres.
 */

import { describe, expect, it, vi } from "vitest";

import { createPasswordResetRepository } from "./passwordReset.repository.js";

const fakeDb = (over: Partial<Record<string, unknown>> = {}) => ({
  passwordResetChallenge: {
    findFirst: vi.fn(async () => null),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async (arg: { data: unknown }) => ({
      id: 1,
      userId: 7,
      codeHash: "hash",
      expiresAt: EXPIRES,
      usedAt: null,
      createdAt: NOW,
      ...(arg.data as object),
    })),
    updateMany: vi.fn(async () => ({ count: 0 })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    ...over,
  },
  $executeRaw: vi.fn(async () => 0),
});

const repoOver = (db: ReturnType<typeof fakeDb>) => createPasswordResetRepository(db as never);

const NOW = new Date("2026-09-03T12:00:00.000Z");
const EXPIRES = new Date("2026-09-03T12:10:00.000Z");

describe("the most recent row for a user", () => {
  it("orders by created_at descending and takes one", async () => {
    const db = fakeDb();

    await repoOver(db).findMostRecentForUser(7);

    expect(db.passwordResetChallenge.findFirst).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: { createdAt: "desc" },
    });
  });

  it("is null when the user has never had one", async () => {
    const db = fakeDb();

    const row = await repoOver(db).findMostRecentForUser(7);

    expect(row).toBeNull();
  });
});

describe("the per-user lock", () => {
  it("is taken via $executeRaw, since pg_advisory_xact_lock returns void", async () => {
    const db = fakeDb();

    await repoOver(db).lockUser(7, db as never);

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe("creating a challenge", () => {
  it("writes exactly userId, codeHash and expiresAt", async () => {
    const db = fakeDb();

    await repoOver(db).createChallenge({ userId: 7, codeHash: "abc", expiresAt: EXPIRES });

    expect(db.passwordResetChallenge.create).toHaveBeenCalledWith({
      data: { userId: 7, codeHash: "abc", expiresAt: EXPIRES },
    });
  });
});

describe("lookup by digest", () => {
  it("queries the unique code_hash index", async () => {
    const db = fakeDb();

    await repoOver(db).findByCodeHash("abc");

    expect(db.passwordResetChallenge.findUnique).toHaveBeenCalledWith({
      where: { codeHash: "abc" },
    });
  });

  it("carries the hash through when a row is found", async () => {
    const db = fakeDb({
      findUnique: vi.fn(async () => ({
        id: 1,
        userId: 7,
        codeHash: "abc",
        expiresAt: EXPIRES,
        usedAt: null,
        createdAt: NOW,
      })),
    });

    const row = await repoOver(db).findByCodeHash("abc");

    expect(row?.codeHash).toBe("abc");
  });
});

describe("marking a row used", () => {
  it("is conditional on the row still being unused", async () => {
    const db = fakeDb();

    await repoOver(db).markUsed(1, NOW);

    expect(db.passwordResetChallenge.updateMany).toHaveBeenCalledWith({
      where: { id: 1, usedAt: null },
      data: { usedAt: NOW },
    });
  });

  it("reports zero when the row was already used", async () => {
    const db = fakeDb({ updateMany: vi.fn(async () => ({ count: 0 })) });

    const matched = await repoOver(db).markUsed(1, NOW);

    expect(matched).toBe(0);
  });

  it("reports one on a genuine first use", async () => {
    const db = fakeDb({ updateMany: vi.fn(async () => ({ count: 1 })) });

    const matched = await repoOver(db).markUsed(1, NOW);

    expect(matched).toBe(1);
  });
});

describe("pruning", () => {
  it("removes rows used or expired before the cutoff", async () => {
    const db = fakeDb({ deleteMany: vi.fn(async () => ({ count: 4 })) });

    const removed = await repoOver(db).deleteBefore(NOW);

    expect(removed).toBe(4);
    expect(db.passwordResetChallenge.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ usedAt: { lt: NOW } }, { expiresAt: { lt: NOW } }] },
    });
  });
});
