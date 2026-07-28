/**
 * Report-mode Oracle (WI-B, #375) — O1–O10 + O12 against a disposable database.
 *
 * The referenced / reference-ended fixtures are driven through the REAL Tweet,
 * Comment, and PATCH /users/me Avatar producers; the pure-state fixtures are
 * seeded directly. One report pass runs the unmodified reclaimer on a tapped
 * client, then the Oracle asserts each fixture's independently-authored literal
 * outcome plus the global invariants — including that report mutates NOTHING and
 * touches only registry models.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDisposableMediaEnv, type DisposableMediaEnv } from "./disposable-env.js";
import {
  assertNoDeletedReferenced,
  assertRegistryOnly,
  assertReportChangedNothing,
  objectRowCount,
  observe,
  auditFor,
  snapshotStatuses,
  storageKeySet,
  tapModels,
  type ObservedState,
} from "./oracle.js";
import {
  boundServices,
  endAvatarReference,
  endCommentReference,
  endTweetReference,
  referenceViaAvatar,
  referenceViaComment,
  referenceViaTweet,
  seedOpenQuarantine,
  seedOrphanBytes,
  seedOwnedReady,
  seedUser,
} from "./producers.js";
import { createReclamationRepository } from "../media.reclamation.repository.js";
import { runReclamation, type ReclamationReport } from "../media.reclamation.js";

const NOW = new Date("2026-07-28T12:00:00.000Z");
const GRACE_MS = 24 * 60 * 60 * 1000;
const OLD = new Date(NOW.getTime() - 2 * GRACE_MS); // past grace
const YOUNG = new Date(NOW.getTime() - GRACE_MS / 2); // within grace

const READY_KEPT: ObservedState = { status: "ready", referenced: false, bytesPresent: true };
const READY_REFERENCED: ObservedState = { status: "ready", referenced: true, bytesPresent: true };

let env: DisposableMediaEnv | null = null;
let reachable = false;

type Fx = { id: number; key: string };
const fx: Record<string, Fx> = {};
let orphanKey = "";
let report: ReclamationReport;
let touched: Set<string>;
let rowsBefore = 0;
let rowsAfter = 0;
let changedNothing: { ok: boolean; err?: string } = { ok: false };

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

  const author = await seedUser(e);
  const baseTweet = await boundServices(e).tweets.create(author, "base tweet", []);

  // O1 — referenced by a live tweet
  const o1 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  await referenceViaTweet(e, author, o1.token);
  fx.O1 = { id: o1.id, key: o1.key };

  // O2 — tweet reference ended, past grace
  const o2 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  const t2 = await referenceViaTweet(e, author, o2.token);
  await endTweetReference(e, t2, author);
  fx.O2 = { id: o2.id, key: o2.key };

  // O3 — referenced by a live comment
  const o3 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  await referenceViaComment(e, author, baseTweet.id, o3.token);
  fx.O3 = { id: o3.id, key: o3.key };

  // O4 — comment reference ended, past grace
  const o4 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  const c4 = await referenceViaComment(e, author, baseTweet.id, o4.token);
  await endCommentReference(e, c4, author);
  fx.O4 = { id: o4.id, key: o4.key };

  // O5 — current avatar (own user)
  const u5 = await seedUser(e);
  const o5 = await seedOwnedReady(e, { userId: u5, createdAt: OLD });
  await referenceViaAvatar(e, u5, o5.token);
  fx.O5 = { id: o5.id, key: o5.key };

  // O6 — avatar replaced/removed, past grace
  const u6 = await seedUser(e);
  const o6 = await seedOwnedReady(e, { userId: u6, createdAt: OLD });
  await referenceViaAvatar(e, u6, o6.token);
  await endAvatarReference(e, u6);
  fx.O6 = { id: o6.id, key: o6.key };

  // O7 — never referenced, within grace
  const o7 = await seedOwnedReady(e, { userId: author, createdAt: YOUNG });
  fx.O7 = { id: o7.id, key: o7.key };

  // O8 — never referenced, past grace
  const o8 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  fx.O8 = { id: o8.id, key: o8.key };

  // O9 — row without bytes
  const o9 = await seedOwnedReady(e, { userId: author, createdAt: OLD, withBytes: false });
  fx.O9 = { id: o9.id, key: o9.key };

  // O10 — orphan bytes (no row)
  orphanKey = (await seedOrphanBytes(e)).key;

  // O12 — under an open quarantine (excluded from selection)
  const o12 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  await seedOpenQuarantine(e, o12.id, o12.key);
  fx.O12 = { id: o12.id, key: o12.key };

  const ids = Object.values(fx).map((f) => f.id);
  const before = { keys: await storageKeySet(e), statuses: await snapshotStatuses(e, ids) };
  rowsBefore = await objectRowCount(e);

  // ── One report pass, on a tapped client (runtime registry-only proof) ──
  const tap = tapModels(e.prisma);
  touched = tap.touched;
  report = await runReclamation({
    storage: e.storage,
    repo: createReclamationRepository(tap.client),
    runInTransaction: e.runInTransaction,
    graceMs: GRACE_MS,
    batch: 1000,
    mode: "report",
    now: () => NOW,
    log: () => {},
  });

  const after = { keys: await storageKeySet(e), statuses: await snapshotStatuses(e, ids) };
  rowsAfter = await objectRowCount(e);
  try {
    assertReportChangedNothing(before, after);
    changedNothing = { ok: true };
  } catch (err) {
    changedNothing = { ok: false, err: String(err) };
  }
}, 120_000);

afterAll(async () => {
  if (env) await env.teardown();
}, 30_000);

describe("report-mode Oracle — per-fixture (real Postgres, disposable DB)", () => {
  const cases: [string, ObservedState, string[]][] = [
    ["O1", READY_REFERENCED, []],
    ["O2", READY_KEPT, ["unreferenced:would_reclaim"]],
    ["O3", READY_REFERENCED, []],
    ["O4", READY_KEPT, ["unreferenced:would_reclaim"]],
    ["O5", READY_REFERENCED, []],
    ["O6", READY_KEPT, ["unreferenced:would_reclaim"]],
    ["O7", READY_KEPT, []],
    ["O8", READY_KEPT, ["unreferenced:would_reclaim"]],
    ["O9", { status: "ready", referenced: false, bytesPresent: false }, ["row_without_bytes:would_quarantine"]],
    ["O12", READY_KEPT, []],
  ];

  for (const [name, expected, expectedAudit] of cases) {
    it(`${name}: state and audit match the authored literal`, async () => {
      if (!reachable || !env) return;
      const f = fx[name]!;
      expect(await observe(env, f.id, f.key)).toEqual(expected);
      expect(await auditFor(env, f.key)).toEqual(expectedAudit);
    });
  }

  it("O10: orphan bytes are surfaced (would_quarantine) and never touched", async () => {
    if (!reachable || !env) return;
    expect(await observe(env, null, orphanKey)).toEqual({
      status: null,
      referenced: false,
      bytesPresent: true,
    });
    expect(await auditFor(env, orphanKey)).toEqual(["orphan_bytes:would_quarantine"]);
  });
});

describe("report-mode Oracle — pass totals and global invariants", () => {
  it("selects exactly the eligible garbage and reclaims/recovers nothing", () => {
    if (!reachable) return;
    expect(report.eligibleUnreferenced).toBe(5); // O2,O4,O6,O8 (intact) + O9 (row-without-bytes)
    expect(report.rowWithoutBytes).toBe(1); // O9
    expect(report.orphanBytes).toBe(1); // O10
    expect(report.reclaimed).toBe(0);
    expect(report.recovered).toBe(0);
  });

  it("report mutated nothing (bytes and statuses identical before/after)", () => {
    if (!reachable) return;
    expect(changedNothing.err ?? "ok").toBe("ok");
    expect(changedNothing.ok).toBe(true);
    expect(rowsAfter).toBe(rowsBefore); // no hard row deletion
  });

  it("no tombstoned object holds a live reference", async () => {
    if (!reachable || !env) return;
    await assertNoDeletedReferenced(env);
  });

  it("runtime selection touched only registry models (no feature schema read)", () => {
    if (!reachable) return;
    assertRegistryOnly(touched);
    expect([...touched].sort()).not.toContain("tweet");
  });
});
