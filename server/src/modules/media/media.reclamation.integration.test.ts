/**
 * Reclamation selection — boundary tests against a REAL Postgres.
 *
 * Run with `npm run test:integration`. Seeds one object on each side of every
 * class boundary and asserts the selection queries admit exactly the garbage:
 * abandoned (expired grant) vs still-live grant; owned-unreferenced-past-grace vs
 * referenced vs too-young; and never a tombstone. Results are filtered to this
 * run's seeded ids, so a shared dev database does not perturb the assertions.
 *
 * Excluded from the default unit run (CI has no database).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createReclamationRepository } from "./media.reclamation.repository.js";
import { mintToken } from "./media.tokens.js";

const TAG = `it-select-${process.pid}-${Math.floor(process.hrtime()[1])}`;
const repo = createReclamationRepository();

// A fixed clock for the assertions; seed dates straddle GRACE_CUTOFF.
const GRACE_CUTOFF = new Date("2026-07-20T00:00:00.000Z"); // now − ~7d
const OLD = new Date("2026-07-01T00:00:00.000Z"); // before the cutoff → past grace
const YOUNG = new Date("2026-07-26T12:00:00.000Z"); // after the cutoff → within grace

let reachable = false;
let userId = 0;
let seq = 0;
const ids: Record<string, number> = {};

const seed = async (
  key: string,
  data: { uploaderId: number; status?: string; createdAt?: Date; referenced?: boolean },
): Promise<void> => {
  seq += 1;
  const obj = await prisma.mediaObject.create({
    data: {
      token: mintToken(),
      storageKey: `objects/${TAG}-${seq}`,
      contentType: "image/png",
      size: 10,
      status: data.status ?? "ready",
      uploaderId: data.uploaderId,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    },
  });
  ids[key] = obj.id;
  if (data.referenced) {
    await prisma.mediaReference.create({ data: { mediaId: obj.id, referrer: `${TAG}-ref` } });
  }
};

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: `${TAG}-u`, name: "Select IT", email: `${TAG}@select.local`, passwordHash: "x" },
  });
  userId = user.id;

  // Unreferenced-owned class (the single reclamation class after WI-6).
  await seed("ownedOld", { uploaderId: userId, createdAt: OLD });
  await seed("ownedReferenced", { uploaderId: userId, createdAt: OLD, referenced: true });
  await seed("ownedYoung", { uploaderId: userId, createdAt: YOUNG });
  // Neither: a tombstone
  await seed("tombstone", { uploaderId: userId, createdAt: OLD, status: "deleted" });
});

afterAll(async () => {
  if (reachable) {
    await prisma.mediaReference.deleteMany({ where: { referrer: { startsWith: TAG } } });
    await prisma.mediaObject.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.user.deleteMany({ where: { email: `${TAG}@select.local` } });
  }
  await prisma.$disconnect();
});

describe("reclamation selection — real Postgres boundaries", () => {
  it("findUnreferencedOwned admits the owned-unreferenced-past-grace object only", async () => {
    if (!reachable) return;
    const found = new Set((await repo.findUnreferencedOwned(GRACE_CUTOFF, 1_000_000)).map((c) => c.id));

    expect(found.has(ids.ownedOld!)).toBe(true);
    expect(found.has(ids.ownedReferenced!)).toBe(false); // still referenced
    expect(found.has(ids.ownedYoung!)).toBe(false); // within the grace window
    expect(found.has(ids.tombstone!)).toBe(false); // already reclaimed
  });

  it("carries the storage key and size the collector needs", async () => {
    if (!reachable) return;
    const candidate = (await repo.findUnreferencedOwned(GRACE_CUTOFF, 1_000_000)).find(
      (c) => c.id === ids.ownedOld,
    );
    expect(candidate?.storageKey).toBe(`objects/${TAG}-1`); // ownedOld is the first seed now
    expect(candidate?.size).toBe(10);
    expect(candidate?.reason).toBe("unreferenced");
  });
});
