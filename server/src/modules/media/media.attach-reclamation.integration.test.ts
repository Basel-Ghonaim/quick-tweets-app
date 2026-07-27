/**
 * Attach ↔ reclamation concurrency — integration tests against a REAL Postgres.
 *
 * Run with `npm run test:integration` (needs a reachable DATABASE_URL). These
 * prove the property a unit test with fakes cannot: that the attach path and a
 * reclaimer serialize on the MediaObject row, so a newly-referenced object can
 * never be left tombstoned-and-referenced (the M11 race). The dangerous
 * interleaving — reclaimer verifies unreferenced, attach begins, reclaimer
 * tombstones — is exercised directly, with the reclaimer's row lock held on a
 * dedicated `pg` connection while the *real* hardened attach runs on Prisma.
 *
 * Excluded from the default unit run (CI has no database).
 */

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma, runInTransaction } from "../../shared/database/index.js";
import { MediaAttachError } from "./media.errors.js";
import { createMediaOwnership } from "./media.ownership.js";
import { createMediaReferences } from "./media.references.js";
import { createMediaRepository } from "./media.repository.js";
import { mintToken } from "./media.tokens.js";

const CONN = process.env.DATABASE_URL ?? "";
// Unique per run, so a crashed run never collides with the next one.
const TAG = `it-reclaim-${process.pid}-${Math.floor(process.hrtime()[1])}`;

const ownership = createMediaOwnership();
const references = createMediaReferences();
const repo = createMediaRepository();

let reachable = false;
let userId = 0;
let seq = 0;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: `${TAG}-u`, name: "Reclaim IT", email: `${TAG}@reclaim.local`, passwordHash: "x" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (reachable) {
    // FK-safe order: references (Restrict) → objects → user.
    await prisma.mediaReference.deleteMany({ where: { referrer: { startsWith: TAG } } });
    await prisma.mediaObject.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.user.deleteMany({ where: { email: `${TAG}@reclaim.local` } });
  }
  await prisma.$disconnect();
});

/** Seed an owned, servable object (the unreferenced-owned reclamation class). */
const seedOwnedReady = async (): Promise<{ id: number; token: string }> => {
  seq += 1;
  const token = mintToken();
  const obj = await prisma.mediaObject.create({
    data: {
      token,
      storageKey: `objects/${TAG}-${seq}`,
      contentType: "image/png",
      size: 10,
      status: "ready",
      uploaderId: userId,
    },
  });
  return { id: obj.id, token };
};

describe("attach ↔ reclamation — real Postgres", () => {
  it("attach BLOCKS while a reclaimer holds the row lock, then REFUSES the tombstoned object", async () => {
    if (!reachable) return; // no DB — treated as skipped
    const { id, token } = await seedOwnedReady();

    // A reclaimer transaction on a dedicated connection takes FOR UPDATE and holds it.
    const reclaimer = new pg.Client({ connectionString: CONN });
    await reclaimer.connect();
    await reclaimer.query("BEGIN");
    await reclaimer.query("SELECT id FROM media_objects WHERE id = $1 FOR UPDATE", [id]);

    // Launch the REAL hardened attach; it must block inside authorizeAttachMany's
    // FOR UPDATE. Convert settle into a value so the promise never rejects unawaited.
    let settled = false;
    const attachP = runInTransaction(async (tx) => {
      const [attached] = await ownership.authorizeAttachMany([{ token, ownerId: userId }], tx);
      await references.referenceBegan({ mediaId: attached!.referenceId, referrer: `${TAG}-c1` }, tx);
    }).then(
      () => { settled = true; return "resolved" as const; },
      (e: unknown) => { settled = true; return e; },
    );

    // It must still be pending — blocked on the reclaimer's lock.
    await new Promise((r) => setTimeout(r, 300));
    expect(settled).toBe(false);

    // The reclaimer tombstones and commits, releasing the lock.
    await reclaimer.query("UPDATE media_objects SET status = 'deleted' WHERE id = $1", [id]);
    await reclaimer.query("COMMIT");
    await reclaimer.end();

    // The attach unblocks, re-reads status='deleted' under its own lock, and refuses.
    const outcome = await attachP;
    expect(outcome).toBeInstanceOf(MediaAttachError);

    // The invariant: no dangling reference, and the object stayed tombstoned.
    expect(await prisma.mediaReference.count({ where: { mediaId: id } })).toBe(0);
    const after = await prisma.mediaObject.findUnique({ where: { id } });
    expect(after?.status).toBe("deleted");
  });

  it("once an attach commits its reference, a reclaimer re-count sees it (attach-first wins)", async () => {
    if (!reachable) return;
    const { id, token } = await seedOwnedReady();

    await runInTransaction(async (tx) => {
      const [attached] = await ownership.authorizeAttachMany([{ token, ownerId: userId }], tx);
      await references.referenceBegan({ mediaId: attached!.referenceId, referrer: `${TAG}-c2` }, tx);
    });

    // A reclaimer's guard is `countReferences = 0`; the committed reference makes
    // it 1, so the reclaimer skips and the object stays servable.
    expect(await prisma.mediaReference.count({ where: { mediaId: id } })).toBe(1);
    const obj = await prisma.mediaObject.findUnique({ where: { id } });
    expect(obj?.status).toBe("ready");
  });

  it("authorizeAttach returns the object's authoritative contentType and size (WI-1)", async () => {
    if (!reachable) return;
    seq += 1;
    const token = mintToken();
    await prisma.mediaObject.create({
      data: {
        token,
        storageKey: `objects/${TAG}-${seq}`,
        contentType: "image/jpeg",
        size: 4321,
        status: "ready",
        uploaderId: userId,
      },
    });

    // The metadata travels with the reference from the same locked read — so a
    // consumer evaluates policy over Media's authoritative facts (ADR 0008 D6).
    const [attached] = await ownership.authorizeAttachMany([{ token, ownerId: userId }]);

    expect(attached).toMatchObject({ contentType: "image/jpeg", size: 4321 });
  });
});
