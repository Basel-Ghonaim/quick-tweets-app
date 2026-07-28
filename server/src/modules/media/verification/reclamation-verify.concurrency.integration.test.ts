/**
 * O13 attach-vs-reclaim concurrency (WI-B, #375) — real-Postgres lock
 * serialization, against the disposable database.
 *
 * Reclaim-wins: a reclaimer holds the row lock (FOR UPDATE) while the REAL attach
 * blocks; the reclaimer tombstones and commits; the attach unblocks, re-reads
 * `status='deleted'` under its own lock, and REFUSES (MediaAttachError). The row
 * is retained as a tombstone and its bytes are reclaimed — never a hard delete,
 * never a dangling reference.
 *
 * Attach-wins: the REAL attach commits its reference first; the reclaimer's
 * under-lock re-check (`refs > 0`) then returns false and skips — the object stays
 * ready and referenced.
 *
 * Global invariant across both interleavings: no object is ever both tombstoned
 * and referenced.
 */

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDisposableMediaEnv, type DisposableMediaEnv } from "./disposable-env.js";
import { assertNoDeletedReferenced, observe, type ObservedState } from "./oracle.js";
import { boundServices, seedOwnedReady, seedUser } from "./producers.js";
import { MediaAttachError } from "../media.errors.js";
import { createReclamationRepository } from "../media.reclamation.repository.js";
import { runReclamation } from "../media.reclamation.js";

const NOW = new Date("2026-07-28T12:00:00.000Z");
const GRACE_MS = 24 * 60 * 60 * 1000;
const OLD = new Date(NOW.getTime() - 2 * GRACE_MS);

const RECLAIMED: ObservedState = { status: "deleted", referenced: false, bytesPresent: false };
const READY_REFERENCED: ObservedState = { status: "ready", referenced: true, bytesPresent: true };

let env: DisposableMediaEnv | null = null;
let reachable = false;

// reclaim-wins
let attachStillBlocked = false;
let attachOutcome: unknown;
let xFinal: ObservedState;
let xRefs = -1;
// attach-wins
let tombstoned = true;
let yFinal: ObservedState;

beforeAll(async () => {
  try {
    env = await createDisposableMediaEnv();
  } catch (err) {
    console.warn(`[wib] disposable env unavailable — skipping: ${String(err)}`);
    reachable = false;
    return;
  }
  reachable = true;
  const e = env;
  const { port } = boundServices(e);
  const userId = await seedUser(e);

  // ── Reclaim-wins ──
  const x = await seedOwnedReady(e, { userId, createdAt: OLD });
  const holder = new pg.Client({ connectionString: e.connectionString });
  await holder.connect();
  await holder.query("BEGIN");
  await holder.query("SELECT id FROM media_objects WHERE id = $1 FOR UPDATE", [x.id]);

  let settled = false;
  const attachP = e
    .runInTransaction(async (tx) => {
      const [attached] = await port.ownership.authorizeAttachMany([{ token: x.token, ownerId: userId }], tx);
      await port.references.referenceBegan({ mediaId: attached!.referenceId, referrer: "wib-o13-x" }, tx);
    })
    .then(
      () => { settled = true; return "resolved" as const; },
      (err: unknown) => { settled = true; return err; },
    );

  await new Promise((r) => setTimeout(r, 300));
  attachStillBlocked = settled === false; // blocked on the reclaimer's lock

  await holder.query("UPDATE media_objects SET status = 'deleted' WHERE id = $1", [x.id]);
  await holder.query("COMMIT");
  await holder.end();

  attachOutcome = await attachP; // must be a MediaAttachError

  // A destructive pass reclaims the tombstoned object's lingering bytes.
  await runReclamation({
    storage: e.storage, repo: createReclamationRepository(e.prisma), runInTransaction: e.runInTransaction,
    graceMs: GRACE_MS, batch: 1000, mode: "destructive", now: () => NOW, log: () => {},
  });
  xFinal = await observe(e, x.id, x.key);
  xRefs = await e.prisma.mediaReference.count({ where: { mediaId: x.id } });

  // ── Attach-wins ──
  const y = await seedOwnedReady(e, { userId, createdAt: OLD });
  await e.runInTransaction(async (tx) => {
    const [attached] = await port.ownership.authorizeAttachMany([{ token: y.token, ownerId: userId }], tx);
    await port.references.referenceBegan({ mediaId: attached!.referenceId, referrer: "wib-o13-y" }, tx);
  });
  const repo = createReclamationRepository(e.prisma);
  tombstoned = await e.runInTransaction((tx) => repo.tombstoneIfReclaimable(y.id, tx));
  yFinal = await observe(e, y.id, y.key);
}, 120_000);

afterAll(async () => {
  if (env) await env.teardown();
}, 30_000);

describe("O13 — reclaim wins the lock", () => {
  it("the real attach blocks while the reclaimer holds the row lock", () => {
    if (!reachable) return;
    expect(attachStillBlocked).toBe(true);
  });

  it("the attach refuses the tombstoned object (MediaAttachError), leaving no reference", () => {
    if (!reachable) return;
    expect(attachOutcome).toBeInstanceOf(MediaAttachError);
    expect(xRefs).toBe(0);
  });

  it("the object is retained as a tombstone and its bytes reclaimed (never hard-deleted)", () => {
    if (!reachable) return;
    expect(xFinal).toEqual(RECLAIMED);
  });
});

describe("O13 — attach wins the lock", () => {
  it("the reclaimer's under-lock re-check skips the now-referenced object", () => {
    if (!reachable) return;
    expect(tombstoned).toBe(false);
    expect(yFinal).toEqual(READY_REFERENCED);
  });
});

describe("O13 — forbidden state", () => {
  it("no object is ever both tombstoned and referenced", async () => {
    if (!reachable || !env) return;
    await assertNoDeletedReferenced(env);
  });
});
