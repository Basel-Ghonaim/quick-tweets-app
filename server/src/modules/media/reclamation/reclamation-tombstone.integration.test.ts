/**
 * tombstoneIfReclaimable — the destructive primitive, against a REAL Postgres.
 *
 * Run with `npm run test:integration`. Exercises the primitive directly on
 * specific seeded ids (never a whole-registry scan, so a shared dev database is
 * never mutated at large): it tombstones an owned, unreferenced, ready object;
 * refuses a referenced one (the re-check under the lock); and is a no-op on an
 * already-tombstoned row. The attach↔reclaim serialization itself is proven in
 * media.attach-reclamation.integration.test.ts.
 *
 * Excluded from the default unit run (CI has no database).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma, runInTransaction } from "../../../shared/database/index.js";
import { createReclamationRepository } from "./reclamation.repository.js";
import { mintToken } from "../media.tokens.js";

const TAG = `it-tomb-${process.pid}-${Math.floor(process.hrtime()[1])}`;
const repo = createReclamationRepository();

let reachable = false;
let userId = 0;
let seq = 0;

const seedOwnedReady = async (opts: { referenced?: boolean; status?: string } = {}): Promise<number> => {
  seq += 1;
  const obj = await prisma.mediaObject.create({
    data: {
      token: mintToken(),
      storageKey: `objects/${TAG}-${seq}`,
      contentType: "image/png",
      size: 10,
      status: opts.status ?? "ready",
      uploaderId: userId,
    },
  });
  if (opts.referenced) {
    await prisma.mediaReference.create({ data: { mediaId: obj.id, referrer: `${TAG}-ref` } });
  }
  return obj.id;
};

const statusOf = async (id: number): Promise<string | undefined> =>
  (await prisma.mediaObject.findUnique({ where: { id } }))?.status;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: `${TAG}-u`, name: "Tomb IT", email: `${TAG}@tomb.local`, passwordHash: "x" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (reachable) {
    await prisma.mediaReference.deleteMany({ where: { referrer: { startsWith: TAG } } });
    await prisma.mediaObject.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.user.deleteMany({ where: { email: `${TAG}@tomb.local` } });
  }
  await prisma.$disconnect();
});

describe("tombstoneIfReclaimable — real Postgres", () => {
  it("tombstones an owned, unreferenced, ready object", async () => {
    if (!reachable) return;
    const id = await seedOwnedReady();

    const done = await runInTransaction((tx) => repo.tombstoneIfReclaimable(id, tx));

    expect(done).toBe(true);
    expect(await statusOf(id)).toBe("deleted");
  });

  it("refuses a referenced object — the re-check under the lock (never reclaimed)", async () => {
    if (!reachable) return;
    const id = await seedOwnedReady({ referenced: true });

    const done = await runInTransaction((tx) => repo.tombstoneIfReclaimable(id, tx));

    expect(done).toBe(false);
    expect(await statusOf(id)).toBe("ready"); // untouched
  });

  it("is a no-op on an already-tombstoned object (idempotent)", async () => {
    if (!reachable) return;
    const id = await seedOwnedReady({ status: "deleted" });

    const done = await runInTransaction((tx) => repo.tombstoneIfReclaimable(id, tx));

    expect(done).toBe(false);
  });
});
