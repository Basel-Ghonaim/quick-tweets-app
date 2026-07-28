/**
 * Reclamation orchestrator — report-mode unit tests (fakes, no database).
 *
 * Proves the report pass accounts correctly and — the load-bearing property —
 * mutates nothing (the storage `delete` spy is never called). Divergence
 * bucketing (row-without-bytes, orphan-bytes) is asserted directly. A guardrail
 * test proves the reclamation sources import no feature module.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runReclamation } from "./media.reclamation";
import type {
  IReclamationRepository,
  QuarantineEntry,
  ReclaimCandidate,
  ReclaimReason,
  ReclamationAuditRow,
} from "./media.reclamation.repository";
import type { StorageAdapter, StorageKey } from "./media.types";

const key = (s: string): StorageKey => s as StorageKey;

const candidate = (
  id: number,
  reason: ReclaimReason,
  over: Partial<ReclaimCandidate> = {},
): ReclaimCandidate => ({ id, storageKey: key(`objects/${id}`), size: 10, reason, ...over });

const makeRepo = (over: Partial<IReclamationRepository> = {}): IReclamationRepository => ({
  findUnreferencedOwned: async () => [],
  keysWithRow: async () => new Set<string>(),
  tombstoneIfReclaimable: async () => true,
  recordAudit: async () => {},
  openQuarantine: async () => {},
  ...over,
});

/** A fake transaction runner: invoke the callback with an opaque sentinel client. */
const fakeTx: <T>(fn: (tx: never) => Promise<T>) => Promise<T> = (fn) => fn({} as never);

const makeStorage = (over: Partial<StorageAdapter> = {}) => {
  const deleted: string[] = [];
  const adapter: StorageAdapter = {
    save: async () => {},
    createReadStream: async () => Readable.from([]),
    exists: async () => true,
    delete: async (k) => { deleted.push(k); },
    enumerate: async () => [],
    ...over,
  };
  return { adapter, deleted };
};

const run = (repo: IReclamationRepository, storage: StorageAdapter, mode: "report" | "destructive" = "report") =>
  runReclamation({ storage, repo, graceMs: 0, batch: 100, mode, log: () => {} });

describe("reclamation orchestrator — report mode", () => {
  it("counts eligible candidates and would-reclaim bytes, and MUTATES NOTHING", async () => {
    const { adapter, deleted } = makeStorage({ exists: async () => true });
    const repo = makeRepo({
      findUnreferencedOwned: async () => [candidate(2, "unreferenced", { size: 50 })],
    });

    const report = await run(repo, adapter);

    // The abandoned-grant class was retired (WI-6); reclamation is single-class.
    expect(report.eligibleAbandoned).toBe(0);
    expect(report.eligibleUnreferenced).toBe(1);
    expect(report.wouldReclaimBytes).toBe(50);
    expect(report.reclaimed).toBe(0);
    expect(deleted).toHaveLength(0); // the load-bearing invariant: report deletes nothing
  });

  it("classifies a candidate whose bytes are gone as row-without-bytes, never reclaimable", async () => {
    const { adapter } = makeStorage({ exists: async (k) => k !== "objects/2" });
    const repo = makeRepo({ findUnreferencedOwned: async () => [candidate(2, "unreferenced")] });

    const report = await run(repo, adapter);

    expect(report.rowWithoutBytes).toBe(1);
    expect(report.wouldReclaimBytes).toBe(0); // divergent → excluded from the would-reclaim set
    expect(report.quarantined).toBe(1);
  });

  it("classifies stored keys with no registry row as orphan bytes", async () => {
    const { adapter } = makeStorage({
      enumerate: async () => [key("objects/keep"), key("objects/orphan")],
    });
    const repo = makeRepo({ keysWithRow: async () => new Set(["objects/keep"]) });

    const report = await run(repo, adapter);

    expect(report.orphanBytes).toBe(1);
    expect(report.quarantined).toBe(1);
  });
});

describe("reclamation orchestrator — destructive mode (dark path)", () => {
  it("tombstones each intact candidate, then deletes its bytes (tombstone before bytes)", async () => {
    const order: string[] = [];
    const deleted: string[] = [];
    const adapter: StorageAdapter = {
      save: async () => {},
      createReadStream: async () => Readable.from([]),
      exists: async () => true,
      enumerate: async () => [],
      delete: async (k) => { order.push(`delete:${k}`); deleted.push(k); },
    };
    const repo = makeRepo({
      findUnreferencedOwned: async () => [candidate(1, "unreferenced"), candidate(2, "unreferenced")],
      tombstoneIfReclaimable: async (id) => { order.push(`tombstone:${id}`); return true; },
    });

    const report = await runReclamation({
      storage: adapter, repo, graceMs: 0, batch: 100, mode: "destructive", runInTransaction: fakeTx, log: () => {},
    });

    expect(report.reclaimed).toBe(2);
    expect(deleted).toEqual(["objects/1", "objects/2"]);
    expect(order).toEqual(["tombstone:1", "delete:objects/1", "tombstone:2", "delete:objects/2"]);
  });

  it("skips a candidate whose re-check fails (a reference began) — never deletes its bytes", async () => {
    const { adapter, deleted } = makeStorage({ exists: async () => true });
    const repo = makeRepo({
      findUnreferencedOwned: async () => [candidate(1, "unreferenced")],
      tombstoneIfReclaimable: async () => false, // lost the race under the lock
    });

    const report = await runReclamation({
      storage: adapter, repo, graceMs: 0, batch: 100, mode: "destructive", runInTransaction: fakeTx, log: () => {},
    });

    expect(report.reclaimed).toBe(0);
    expect(deleted).toHaveLength(0);
  });

  it("never reclaims a divergent (row-without-bytes) candidate", async () => {
    const tombstoned: number[] = [];
    const { adapter, deleted } = makeStorage({ exists: async () => false }); // bytes gone → divergent
    const repo = makeRepo({
      findUnreferencedOwned: async () => [candidate(1, "unreferenced")],
      tombstoneIfReclaimable: async (id) => { tombstoned.push(id); return true; },
    });

    const report = await runReclamation({
      storage: adapter, repo, graceMs: 0, batch: 100, mode: "destructive", runInTransaction: fakeTx, log: () => {},
    });

    expect(report.rowWithoutBytes).toBe(1);
    expect(report.reclaimed).toBe(0);
    expect(tombstoned).toHaveLength(0); // divergent → excluded from `intact`, never tombstoned
    expect(deleted).toHaveLength(0);
  });
});

describe("reclamation orchestrator — audit + quarantine persistence", () => {
  it("report mode writes 'would_' audit rows and opens NO quarantine (evidence only)", async () => {
    const audits: ReclamationAuditRow[] = [];
    const quarantines: QuarantineEntry[] = [];
    const { adapter } = makeStorage({
      exists: async (k) => k !== "objects/9", // object 9 is a row-without-bytes divergence
      enumerate: async () => [key("objects/orphan")],
    });
    const repo = makeRepo({
      findUnreferencedOwned: async () => [candidate(1, "unreferenced"), candidate(9, "unreferenced")],
      keysWithRow: async () => new Set<string>(), // orphan has no row
      recordAudit: async (rows) => { audits.push(...rows); },
      openQuarantine: async (entries) => { quarantines.push(...entries); },
    });

    await run(repo, adapter);

    expect(quarantines).toHaveLength(0); // report opens no review rows
    const outcomes = audits.map((a) => `${a.reason}:${a.outcome}`).sort();
    expect(outcomes).toEqual([
      "orphan_bytes:would_quarantine",
      "row_without_bytes:would_quarantine",
      "unreferenced:would_reclaim",
    ]);
  });

  it("destructive mode audits 'reclaimed'/'quarantined' and opens the review queue", async () => {
    const audits: ReclamationAuditRow[] = [];
    const quarantines: QuarantineEntry[] = [];
    const { adapter } = makeStorage({
      exists: async (k) => k !== "objects/9",
      enumerate: async () => [key("objects/orphan")],
    });
    const repo = makeRepo({
      findUnreferencedOwned: async () => [candidate(1, "unreferenced"), candidate(9, "unreferenced")],
      keysWithRow: async () => new Set<string>(),
      tombstoneIfReclaimable: async () => true,
      recordAudit: async (rows) => { audits.push(...rows); },
      openQuarantine: async (entries) => { quarantines.push(...entries); },
    });

    await runReclamation({
      storage: adapter, repo, graceMs: 0, batch: 100, mode: "destructive", runInTransaction: fakeTx, log: () => {},
    });

    // The divergences (row-without-bytes for object 9, and the orphan key) are queued.
    expect(quarantines.map((q) => q.kind).sort()).toEqual(["orphan_bytes", "row_without_bytes"]);
    const outcomes = audits.map((a) => `${a.reason}:${a.outcome}`).sort();
    expect(outcomes).toEqual([
      "orphan_bytes:quarantined",
      "row_without_bytes:quarantined",
      "unreferenced:reclaimed",
    ]);
  });
});

describe("reclamation — registry-only guardrail", () => {
  it("neither the orchestrator nor its repository imports a feature module", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const featureImport = /from\s+["']\.\.\/(tweets|comments|auth|users|follows|likes)/;

    for (const file of ["media.reclamation.ts", "media.reclamation.repository.ts"]) {
      const source = readFileSync(path.join(here, file), "utf8");
      expect(source).not.toMatch(featureImport);
    }
  });
});
