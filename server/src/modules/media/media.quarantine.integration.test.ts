/**
 * Quarantine + audit persistence — against a REAL Postgres.
 *
 * Run with `npm run test:integration`. Proves the safety-critical exclusion — an
 * object under an OPEN quarantine row is never selected for reclamation — plus
 * openQuarantine's dedup and recordAudit's append. Scoped to seeded ids so a
 * shared dev database is untouched.
 *
 * Excluded from the default unit run (CI has no database).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createReclamationRepository } from "./media.reclamation.repository.js";
import { mintToken } from "./media.tokens.js";

const TAG = `it-quar-${process.pid}-${Math.floor(process.hrtime()[1])}`;
const repo = createReclamationRepository();
const OLD = new Date("2026-07-01T00:00:00.000Z");
const CUTOFF = new Date("2026-07-20T00:00:00.000Z"); // OLD is past this → eligible

let reachable = false;
let userId = 0;
let seq = 0;

const seedOwnedOld = async (): Promise<{ id: number; key: string }> => {
  seq += 1;
  const key = `objects/${TAG}-${seq}`;
  const obj = await prisma.mediaObject.create({
    data: { token: mintToken(), storageKey: key, contentType: "image/png", size: 10, status: "ready", uploaderId: userId, createdAt: OLD },
  });
  return { id: obj.id, key };
};

const selectedIds = async (): Promise<Set<number>> =>
  new Set((await repo.findUnreferencedOwned(CUTOFF, 1_000_000)).map((c) => c.id));

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: `${TAG}-u`, name: "Quar IT", email: `${TAG}@quar.local`, passwordHash: "x" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (reachable) {
    await prisma.mediaQuarantine.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.mediaReclamationAudit.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.mediaObject.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.user.deleteMany({ where: { email: `${TAG}@quar.local` } });
  }
  await prisma.$disconnect();
});

describe("quarantine + audit — real Postgres", () => {
  it("excludes an object under an OPEN quarantine row from selection", async () => {
    if (!reachable) return;
    const { id, key } = await seedOwnedOld();

    expect((await selectedIds()).has(id)).toBe(true); // eligible before quarantine

    await repo.openQuarantine([{ mediaId: id, storageKey: key, kind: "row_without_bytes", detail: "", detectedAt: new Date(OLD) }]);

    expect((await selectedIds()).has(id)).toBe(false); // excluded while open
  });

  it("openQuarantine dedups — opening the same divergence twice keeps ONE open row", async () => {
    if (!reachable) return;
    const { id, key } = await seedOwnedOld();
    const entry = { mediaId: id, storageKey: key, kind: "row_without_bytes" as const, detail: "", detectedAt: new Date(OLD) };

    await repo.openQuarantine([entry]);
    await repo.openQuarantine([entry]);

    expect(await prisma.mediaQuarantine.count({ where: { mediaId: id, resolvedAt: null } })).toBe(1);
  });

  it("recordAudit appends rows", async () => {
    if (!reachable) return;
    const { id, key } = await seedOwnedOld();

    await repo.recordAudit([
      { mediaId: id, storageKey: key, reason: "unreferenced", outcome: "would_reclaim", bytes: 10, mode: "report", runAt: new Date(OLD) },
    ]);

    expect(await prisma.mediaReclamationAudit.count({ where: { mediaId: id } })).toBe(1);
  });
});
