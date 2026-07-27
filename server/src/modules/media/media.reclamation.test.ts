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
import type { IReclamationRepository, ReclaimCandidate, ReclaimReason } from "./media.reclamation.repository";
import type { StorageAdapter, StorageKey } from "./media.types";

const key = (s: string): StorageKey => s as StorageKey;

const candidate = (
  id: number,
  reason: ReclaimReason,
  over: Partial<ReclaimCandidate> = {},
): ReclaimCandidate => ({ id, storageKey: key(`objects/${id}`), size: 10, reason, ...over });

const makeRepo = (over: Partial<IReclamationRepository> = {}): IReclamationRepository => ({
  findAbandoned: async () => [],
  findUnreferencedOwned: async () => [],
  keysWithRow: async () => new Set<string>(),
  ...over,
});

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
      findAbandoned: async () => [candidate(1, "abandoned", { size: 100 })],
      findUnreferencedOwned: async () => [candidate(2, "unreferenced", { size: 50 })],
    });

    const report = await run(repo, adapter);

    expect(report.eligibleAbandoned).toBe(1);
    expect(report.eligibleUnreferenced).toBe(1);
    expect(report.wouldReclaimBytes).toBe(150);
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
