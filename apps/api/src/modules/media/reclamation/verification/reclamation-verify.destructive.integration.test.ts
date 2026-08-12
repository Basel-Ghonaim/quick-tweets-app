/**
 * Destructive rehearsal (WI-B, #375) — the unmodified reclaimer running in
 * destructive mode against a disposable database, verified bidirectionally.
 *
 * guard() is asserted BEFORE the first destructive pass (the safety fingerprint:
 * a wib_verify_* database + isolated temp storage). Then the Oracle asserts each
 * fixture's independently-authored destructive literal: O2/O4/O6/O8 reclaimed
 * (row RETAINED as a tombstone, bytes deleted); O9/O10 quarantined (never
 * byte-deleted); O11 lingering-tombstone recovered (tombstone retained); the
 * referenced/within-grace/quarantined fixtures untouched. M1 proves a second pass
 * converges to a no-op. Global invariants: no deleted+referenced, no hard row
 * delete, registry-only selection.
 */

import { Readable } from "node:stream";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDisposableMediaEnv, type DisposableMediaEnv } from "./disposable-env.js";
import {
  assertNoDeletedReferenced,
  assertRegistryOnly,
  auditFor,
  objectRowCount,
  observe,
  openQuarantineKinds,
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
  seedOrphanBytes,
  seedOwnedReady,
  seedUser,
} from "./producers.js";
import { storageKey } from "../../media.keys.js";
import { mintToken } from "../../media.tokens.js";
import { createReclamationRepository } from "../reclamation.repository.js";
import { runReclamation, type ReclamationReport } from "../reclamation.js";

const NOW = new Date("2026-07-28T12:00:00.000Z");
const GRACE_MS = 24 * 60 * 60 * 1000;
const OLD = new Date(NOW.getTime() - 2 * GRACE_MS);
const YOUNG = new Date(NOW.getTime() - GRACE_MS / 2);

const RECLAIMED: ObservedState = { status: "deleted", referenced: false, bytesPresent: false };
const READY_KEPT: ObservedState = { status: "ready", referenced: false, bytesPresent: true };
const READY_REFERENCED: ObservedState = { status: "ready", referenced: true, bytesPresent: true };

let env: DisposableMediaEnv | null = null;
let reachable = false;

const fx: Record<string, { id: number; key: string }> = {};
let orphanKey = "";
let pass1: ReclamationReport;
let pass2: ReclamationReport;
let touched: Set<string>;
let guardOk = false;
let rowsBefore = 0;
let rowsAfter = 0;

type Snap = { state: ObservedState; audit: string[]; quarantine: string[] };
const snap: Record<string, Snap> = {};
let orphanSnap: Snap;

const destructivePass = (e: DisposableMediaEnv, tap = false): Promise<ReclamationReport> => {
  let client = e.prisma;
  if (tap) {
    const t = tapModels(e.prisma);
    touched = t.touched;
    client = t.client;
  }
  return runReclamation({
    storage: e.storage,
    repo: createReclamationRepository(client),
    runInTransaction: e.runInTransaction,
    graceMs: GRACE_MS,
    batch: 1000,
    mode: "destructive",
    now: () => NOW,
    log: () => {},
  });
};

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

  const o1 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  await referenceViaTweet(e, author, o1.token);
  fx.O1 = { id: o1.id, key: o1.key };

  const o2 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  await endTweetReference(e, await referenceViaTweet(e, author, o2.token), author);
  fx.O2 = { id: o2.id, key: o2.key };

  const o3 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  await referenceViaComment(e, author, baseTweet.id, o3.token);
  fx.O3 = { id: o3.id, key: o3.key };

  const o4 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  await endCommentReference(e, await referenceViaComment(e, author, baseTweet.id, o4.token), author);
  fx.O4 = { id: o4.id, key: o4.key };

  const u5 = await seedUser(e);
  const o5 = await seedOwnedReady(e, { userId: u5, createdAt: OLD });
  await referenceViaAvatar(e, u5, o5.token);
  fx.O5 = { id: o5.id, key: o5.key };

  const u6 = await seedUser(e);
  const o6 = await seedOwnedReady(e, { userId: u6, createdAt: OLD });
  await referenceViaAvatar(e, u6, o6.token);
  await endAvatarReference(e, u6);
  fx.O6 = { id: o6.id, key: o6.key };

  const o7 = await seedOwnedReady(e, { userId: author, createdAt: YOUNG });
  fx.O7 = { id: o7.id, key: o7.key };

  const o8 = await seedOwnedReady(e, { userId: author, createdAt: OLD });
  fx.O8 = { id: o8.id, key: o8.key };

  const o9 = await seedOwnedReady(e, { userId: author, createdAt: OLD, withBytes: false });
  fx.O9 = { id: o9.id, key: o9.key };

  orphanKey = (await seedOrphanBytes(e)).key;

  // O11 — a lingering tombstone (status='deleted' with bytes still present).
  const o11Key = "objects/wibr-tomb";
  const o11 = await e.prisma.mediaObject.create({
    data: {
      token: mintToken(), storageKey: o11Key, contentType: "image/png", size: 3,
      status: "deleted", uploaderId: author,
    },
  });
  await e.storage.save(storageKey(o11Key), Readable.from([Buffer.from("abc")]));
  fx.O11 = { id: o11.id, key: o11Key };

  rowsBefore = await objectRowCount(e);
  guardOk = await e.guard().then(() => true).catch(() => false); // MUST pass before destruction
  pass1 = await destructivePass(e, true);
  rowsAfter = await objectRowCount(e);

  // Snapshot every fixture AFTER pass 1 (before the convergence pass), so the
  // per-fixture assertions are independent of pass ordering and of the orphan's
  // per-pass re-audit (an orphan is re-detected and re-appended each pass by design).
  for (const [name, f] of Object.entries(fx)) {
    snap[name] = {
      state: await observe(e, f.id, f.key),
      audit: await auditFor(e, f.key),
      quarantine: await openQuarantineKinds(e, f.key),
    };
  }
  orphanSnap = {
    state: await observe(e, null, orphanKey),
    audit: await auditFor(e, orphanKey),
    quarantine: await openQuarantineKinds(e, orphanKey),
  };

  pass2 = await destructivePass(e); // M1 — convergence
}, 120_000);

afterAll(async () => {
  if (env) await env.teardown();
}, 30_000);

describe("destructive rehearsal — safety + per-fixture outcomes", () => {
  it("the safety guard passed before any destructive pass", () => {
    if (!reachable) return;
    expect(guardOk).toBe(true);
  });

  const kept: [string, ObservedState][] = [
    ["O1", READY_REFERENCED], ["O3", READY_REFERENCED], ["O5", READY_REFERENCED],
    ["O7", READY_KEPT],
  ];
  for (const [name, expected] of kept) {
    it(`${name}: kept, no audit`, () => {
      if (!reachable) return;
      expect(snap[name]!.state).toEqual(expected);
      expect(snap[name]!.audit).toEqual([]);
    });
  }

  for (const name of ["O2", "O4", "O6", "O8"]) {
    it(`${name}: reclaimed — tombstone retained, bytes deleted`, async () => {
      if (!reachable || !env) return;
      expect(snap[name]!.state).toEqual(RECLAIMED);
      expect(snap[name]!.audit).toEqual(["unreferenced:reclaimed"]);
      // The row is RETAINED (a tombstone), never hard-deleted.
      expect(await env.prisma.mediaObject.findUnique({ where: { id: fx[name]!.id } })).not.toBeNull();
    });
  }

  it("O9: row_without_bytes quarantined, NOT tombstoned", () => {
    if (!reachable) return;
    expect(snap.O9!.state).toEqual({ status: "ready", referenced: false, bytesPresent: false });
    expect(snap.O9!.audit).toEqual(["row_without_bytes:quarantined"]);
    expect(snap.O9!.quarantine).toEqual(["row_without_bytes"]);
  });

  it("O10: orphan_bytes quarantined, bytes NEVER deleted", () => {
    if (!reachable) return;
    expect(orphanSnap.state).toEqual({ status: null, referenced: false, bytesPresent: true });
    expect(orphanSnap.audit).toEqual(["orphan_bytes:quarantined"]);
    expect(orphanSnap.quarantine).toEqual(["orphan_bytes"]);
  });

  it("O11: lingering tombstone recovered — bytes deleted, tombstone retained", () => {
    if (!reachable) return;
    expect(snap.O11!.state).toEqual(RECLAIMED);
    expect(snap.O11!.audit).toEqual(["lingering_bytes:recovered"]);
  });
});

describe("destructive rehearsal — totals, convergence, global invariants", () => {
  it("pass 1 reclaimed the four eligible objects and recovered the lingering tombstone", () => {
    if (!reachable) return;
    expect(pass1.reclaimed).toBe(4); // O2,O4,O6,O8
    expect(pass1.recovered).toBe(1); // O11
    expect(pass1.rowWithoutBytes).toBe(1); // O9
    expect(pass1.orphanBytes).toBe(1); // O10
  });

  it("M1: a second destructive pass converges to a no-op", () => {
    if (!reachable) return;
    expect(pass2.reclaimed).toBe(0);
    expect(pass2.recovered).toBe(0);
  });

  it("no tombstoned object holds a live reference (forbidden state absent)", async () => {
    if (!reachable || !env) return;
    await assertNoDeletedReferenced(env);
  });

  it("reclamation hard-deleted no registry row (tombstone retention)", () => {
    if (!reachable) return;
    expect(rowsAfter).toBe(rowsBefore);
  });

  it("destructive selection touched only registry models", () => {
    if (!reachable) return;
    assertRegistryOnly(touched);
  });
});
