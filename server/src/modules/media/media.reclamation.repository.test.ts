/**
 * Reclamation selection queries — unit tests (mock Prisma via factory DI).
 *
 * These pin the *shape* of the two selection queries — the predicates that make
 * each class computable from Media's own state — and prove they read only the
 * registry (`mediaObject`), never a feature delegate. Real predicate evaluation
 * over seeded rows is proven in media.reclamation.integration.test.ts.
 */

import { describe, expect, it } from "vitest";

import { createReclamationRepository } from "./media.reclamation.repository";

interface FindManyArgs {
  where: Record<string, unknown>;
  select: Record<string, boolean>;
  orderBy: Record<string, string>;
  take: number;
}

const makeDb = () => {
  const calls: FindManyArgs[] = [];
  const db = {
    mediaObject: {
      findMany: async (args: FindManyArgs) => {
        calls.push(args);
        return [{ id: 1, storageKey: "objects/x", size: 10 }];
      },
    },
  };
  return { db, calls };
};

describe("reclamation repository — selection queries", () => {
  it("findUnreferencedOwned targets owned, unreferenced, past-grace, ready objects only", async () => {
    const { db, calls } = makeDb();
    const olderThan = new Date("2026-07-26T00:00:00.000Z");

    const out = await createReclamationRepository(db as never).findUnreferencedOwned(olderThan, 25);

    expect(calls[0]!.where).toEqual({
      status: "ready",
      uploaderId: { not: null },
      createdAt: { lt: olderThan },
      references: { none: {} },
      quarantines: { none: { resolvedAt: null } },
    });
    expect(out[0]!.reason).toBe("unreferenced");
  });

  it("reads only the registry — a feature delegate would not exist on the fake db", async () => {
    // The fake exposes ONLY `mediaObject`. If selection ever reached into
    // tweetMedia / comment / user, this would throw — the registry-only guardrail
    // asserted at the query layer.
    const { db } = makeDb();
    await expect(
      createReclamationRepository(db as never).findUnreferencedOwned(new Date(), 10),
    ).resolves.toBeDefined();
  });

  it("keysWithRow returns the subset of keys that have any registry row", async () => {
    const db = {
      mediaObject: {
        findMany: async (args: { where: { storageKey: { in: string[] } } }) =>
          args.where.storageKey.in
            .filter((k) => k === "objects/a")
            .map((storageKey) => ({ storageKey })),
      },
    };

    const set = await createReclamationRepository(db as never).keysWithRow([
      "objects/a",
      "objects/b",
    ]);

    expect(set.has("objects/a")).toBe(true);
    expect(set.has("objects/b")).toBe(false); // no row → an orphan byte
  });

  it("keysWithRow short-circuits on empty input (no query)", async () => {
    const db = {
      mediaObject: {
        findMany: async () => {
          throw new Error("should not query for an empty key set");
        },
      },
    };

    expect(await createReclamationRepository(db as never).keysWithRow([])).toEqual(new Set());
  });
});
