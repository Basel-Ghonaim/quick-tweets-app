/**
 * Failure isolation + crash recovery (WI-B, #375) — M2 and both M3 boundaries.
 *
 * The two durable-step boundaries of a reclaim are fault-injected independently,
 * each in a batch alongside healthy candidates, to prove per-object isolation:
 *
 * - M3-after  — the byte delete fails AFTER the tombstone commits: the object is
 *   left `deleted` with lingering bytes (recovery backlog), not counted reclaimed;
 *   its batch-mates still reclaim.
 * - M2        — a later pass drains that backlog (bytes deleted, tombstone kept).
 * - M3-before — the tombstone transaction fails BEFORE commit: it rolls back, the
 *   object stays `ready` with bytes intact; its batch-mates still reclaim.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDisposableMediaEnv, type DisposableMediaEnv } from "./disposable-env.js";
import { FaultInjectingStorage, faultTombstoneRepo } from "./fault-injection.js";
import { assertNoDeletedReferenced, observe, type ObservedState } from "./oracle.js";
import { seedOwnedReady, seedUser } from "./producers.js";
import { createReclamationRepository } from "../reclamation.repository.js";
import { runReclamation, type ReclamationReport } from "../reclamation.js";

const NOW = new Date("2026-07-28T12:00:00.000Z");
const GRACE_MS = 24 * 60 * 60 * 1000;
const OLD = new Date(NOW.getTime() - 2 * GRACE_MS);

const RECLAIMED: ObservedState = { status: "deleted", referenced: false, bytesPresent: false };
const LINGERING: ObservedState = { status: "deleted", referenced: false, bytesPresent: true };
const READY_KEPT: ObservedState = { status: "ready", referenced: false, bytesPresent: true };

let env: DisposableMediaEnv | null = null;
let reachable = false;

// M3-after batch
let A: { id: number; key: string };
let B: { id: number; key: string };
let C: { id: number; key: string };
let passAfter: ReclamationReport;
let passRecover: ReclamationReport;
let snapA_afterFault: ObservedState;
let snapB: ObservedState;
let snapC: ObservedState;
let snapA_afterRecover: ObservedState;

// M3-before batch
let D: { id: number; key: string };
let E: { id: number; key: string };
let F: { id: number; key: string };
let passBefore: ReclamationReport;
let snapD: ObservedState;
let snapE: ObservedState;
let snapF: ObservedState;

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
  const user = await seedUser(e);

  const pass = (storage: FaultInjectingStorage | typeof e.storage, repo = createReclamationRepository(e.prisma)) =>
    runReclamation({
      storage, repo, runInTransaction: e.runInTransaction,
      graceMs: GRACE_MS, batch: 1000, mode: "destructive", now: () => NOW, log: () => {},
    });

  // ── Stage 1: M3-after — fault the byte delete for A only ──
  const a = await seedOwnedReady(e, { userId: user, createdAt: OLD });
  const b = await seedOwnedReady(e, { userId: user, createdAt: OLD });
  const c = await seedOwnedReady(e, { userId: user, createdAt: OLD });
  A = { id: a.id, key: a.key }; B = { id: b.id, key: b.key }; C = { id: c.id, key: c.key };
  passAfter = await pass(new FaultInjectingStorage(e.storage, [A.key]));
  snapA_afterFault = await observe(e, A.id, A.key);
  snapB = await observe(e, B.id, B.key);
  snapC = await observe(e, C.id, C.key);

  // ── Stage 2: M2 — a later pass (no fault) drains A's backlog ──
  passRecover = await pass(e.storage);
  snapA_afterRecover = await observe(e, A.id, A.key);

  // ── Stage 3: M3-before — fault the tombstone tx for D only ──
  const d = await seedOwnedReady(e, { userId: user, createdAt: OLD });
  const eObj = await seedOwnedReady(e, { userId: user, createdAt: OLD });
  const f = await seedOwnedReady(e, { userId: user, createdAt: OLD });
  D = { id: d.id, key: d.key }; E = { id: eObj.id, key: eObj.key }; F = { id: f.id, key: f.key };
  passBefore = await pass(e.storage, faultTombstoneRepo(createReclamationRepository(e.prisma), [D.id]));
  snapD = await observe(e, D.id, D.key);
  snapE = await observe(e, E.id, E.key);
  snapF = await observe(e, F.id, F.key);
}, 120_000);

afterAll(async () => {
  if (env) await env.teardown();
}, 30_000);

describe("M3-after — byte delete fails after the tombstone commits", () => {
  it("A is left deleted with lingering bytes (recovery backlog), not counted reclaimed", () => {
    if (!reachable) return;
    expect(snapA_afterFault).toEqual(LINGERING);
    expect(passAfter.reclaimed).toBe(2); // B and C only — A's delete threw
    expect(passAfter.recovered).toBe(0);
  });

  it("A's batch-mates B and C still reclaim (per-object isolation)", () => {
    if (!reachable) return;
    expect(snapB).toEqual(RECLAIMED);
    expect(snapC).toEqual(RECLAIMED);
  });
});

describe("M2 — the next pass drains the crash backlog", () => {
  it("A's lingering bytes are recovered; the tombstone is retained", () => {
    if (!reachable) return;
    expect(passRecover.recovered).toBe(1); // A
    expect(passRecover.reclaimed).toBe(0);
    expect(snapA_afterRecover).toEqual(RECLAIMED);
  });
});

describe("M3-before — tombstone transaction fails before commit", () => {
  it("D rolls back to ready with bytes intact (retryable next pass)", () => {
    if (!reachable) return;
    expect(snapD).toEqual(READY_KEPT);
    expect(passBefore.reclaimed).toBe(2); // E and F only
  });

  it("D's batch-mates E and F still reclaim (per-object isolation)", () => {
    if (!reachable) return;
    expect(snapE).toEqual(RECLAIMED);
    expect(snapF).toEqual(RECLAIMED);
  });
});

describe("failure isolation — global invariant", () => {
  it("no tombstoned object holds a live reference through any failure path", async () => {
    if (!reachable || !env) return;
    await assertNoDeletedReferenced(env);
  });
});
