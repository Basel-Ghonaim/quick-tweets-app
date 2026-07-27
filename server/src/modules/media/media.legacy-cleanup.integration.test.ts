/**
 * WI-5 legacy-cleanup — integration tests against a REAL Postgres.
 *
 * Run with `npm run test:integration`. Proves the safety-critical execution
 * behaviour end-to-end: read-only selection, manifest-bound deletion (a candidate
 * NOT in the manifest is never touched), live drift HALT, and the bytes-first
 * failure/retry outcomes. Every row is seeded under a per-run TAG and cleaned up,
 * and — because execution is manifest-bound — a test can only ever delete what it
 * put in its own manifest, never the real dataset.
 *
 * Excluded from the default unit run (CI has no database).
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createStorageAdapter, storageKey } from "./index.js";
import type { StorageAdapter } from "./media.types.js";
import { mintToken } from "./media.tokens.js";
import {
  buildManifest,
  computeDigest,
  executeManifest,
  readFingerprint,
  selectLegacy,
  type LegacyCandidate,
  type TargetFingerprint,
} from "./media.legacy-cleanup.js";

const TAG = `it-wi5-${process.pid}-${Math.floor(process.hrtime()[1])}`;
const PAST_GRANT = new Date("2026-01-01T00:00:00.000Z");

let reachable = false;
let storageDir = "";
let storage: StorageAdapter;
let fingerprint: TargetFingerprint;
let seq = 0;

interface Seeded {
  id: number;
  storageKey: string;
  token: string;
}

/** Seed a `uploader_id IS NULL` grant-provenance row; optionally write its bytes. */
const seed = async (opts: { withBytes: boolean; grant?: boolean; status?: string }): Promise<Seeded> => {
  seq += 1;
  const key = `objects/${TAG}-${seq}`;
  const token = mintToken();
  const obj = await prisma.mediaObject.create({
    data: {
      token,
      storageKey: key,
      contentType: "image/png",
      size: 10,
      status: opts.status ?? "ready",
      uploaderId: null,
      grantId: opts.grant === false ? null : `${TAG}-g${seq}`,
      grantExpiresAt: opts.grant === false ? null : PAST_GRANT,
    },
  });
  if (opts.withBytes) await storage.save(storageKey(key), Readable.from([Buffer.from("bytes")]));
  return { id: obj.id, storageKey: key, token };
};

const candidateFor = async (id: number): Promise<LegacyCandidate> => {
  const { candidates } = await selectLegacy(storage);
  const found = candidates.find((c) => c.id === id);
  if (!found) throw new Error(`expected id ${id} to select as a candidate`);
  return found;
};

const rowExists = async (id: number): Promise<boolean> =>
  (await prisma.mediaObject.findUnique({ where: { id } })) !== null;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  storageDir = await mkdtemp(path.join(tmpdir(), "wi5-it-"));
  storage = createStorageAdapter(storageDir);
  fingerprint = await readFingerprint();
});

afterAll(async () => {
  if (reachable) {
    await prisma.mediaReference.deleteMany({ where: { referrer: { startsWith: TAG } } });
    await prisma.mediaObject.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
  }
  if (storageDir) await rm(storageDir, { recursive: true, force: true });
  await prisma.$disconnect();
});

describe("selectLegacy — read-only classification", () => {
  it("admits a clean candidate, flags a referenced null-owner as an anomaly, and mutates nothing", async () => {
    if (!reachable) return;
    const clean = await seed({ withBytes: true });
    const referenced = await seed({ withBytes: true });
    await prisma.mediaReference.create({ data: { mediaId: referenced.id, referrer: `${TAG}-ref` } });

    // Scope the read-only assertion to THIS run's rows — other integration files
    // run in parallel against the same database and perturb the global count.
    const scope = { storageKey: { startsWith: `objects/${TAG}` } };
    const before = await prisma.mediaObject.count({ where: scope });
    const { candidates, anomalies } = await selectLegacy(storage);
    const after = await prisma.mediaObject.count({ where: scope });

    expect(after).toBe(before); // read-only (no insert/delete of this run's rows)

    const cand = candidates.find((c) => c.id === clean.id);
    expect(cand?.bytesPresent).toBe(true);
    expect(cand?.grantId).toContain(TAG);

    const anom = anomalies.find((a) => a.id === referenced.id);
    expect(anom).toBeDefined();
    expect(anom?.reasons.join(",")).toContain("ledger_referenced:1");
    // The referenced row must NOT appear as a candidate.
    expect(candidates.some((c) => c.id === referenced.id)).toBe(false);
  });
});

describe("executeManifest — manifest-bound deletion", () => {
  it("deletes an approved candidate bytes-first and leaves a non-manifest candidate untouched", async () => {
    if (!reachable) return;
    const x = await seed({ withBytes: true });
    const y = await seed({ withBytes: true }); // a valid candidate, deliberately NOT in the manifest

    const cx = await candidateFor(x.id);
    const manifest = buildManifest([cx], [], fingerprint, "2026-07-27T00:00:00.000Z");

    const report = await executeManifest(manifest, manifest.digest, storage);

    // X: deleted, row gone, bytes gone.
    expect(report.outcomes).toEqual([{ id: x.id, state: "deleted" }]);
    expect(await rowExists(x.id)).toBe(false);
    expect(await storage.exists(storageKey(x.storageKey))).toBe(false);

    // Y: never in the manifest ⇒ never touched (the core invariant).
    expect(report.outcomes.some((o) => o.id === y.id)).toBe(false);
    expect(await rowExists(y.id)).toBe(true);
    expect(await storage.exists(storageKey(y.storageKey))).toBe(true);

    expect(report.coverageComplete).toBe(true);
  });

  it("HALTS a candidate that drifted (a reference appeared after the manifest was sealed)", async () => {
    if (!reachable) return;
    const x = await seed({ withBytes: true });
    const cx = await candidateFor(x.id);
    const manifest = buildManifest([cx], [], fingerprint, "t");

    // Drift: a reference begins between report and execute.
    await prisma.mediaReference.create({ data: { mediaId: x.id, referrer: `${TAG}-drift` } });

    const report = await executeManifest(manifest, manifest.digest, storage);

    expect(report.outcomes[0]!.state).toBe("drift_halted");
    expect(report.outcomes[0]!.reason).toContain("ledger_referenced");
    expect(await rowExists(x.id)).toBe(true); // not deleted
    expect(await storage.exists(storageKey(x.storageKey))).toBe(true); // bytes intact
  });
});

describe("executeManifest — bytes-first failure / retry semantics", () => {
  it("deletes idempotently when bytes are already absent", async () => {
    if (!reachable) return;
    const x = await seed({ withBytes: false }); // row present, no bytes
    const cx = await candidateFor(x.id);
    expect(cx.bytesPresent).toBe(false);
    const manifest = buildManifest([cx], [], fingerprint, "t");

    const report = await executeManifest(manifest, manifest.digest, storage);

    expect(report.outcomes[0]!.state).toBe("deleted"); // rm(force) over absent bytes still succeeds
    expect(await rowExists(x.id)).toBe(false);
  });

  it("reports already_completed when the row is gone before execute (idempotent retry)", async () => {
    if (!reachable) return;
    const x = await seed({ withBytes: true });
    const cx = await candidateFor(x.id);
    const manifest = buildManifest([cx], [], fingerprint, "t");

    // Simulate a prior run having finished this candidate.
    await storage.delete(storageKey(x.storageKey));
    await prisma.mediaObject.delete({ where: { id: x.id } });

    const report = await executeManifest(manifest, manifest.digest, storage);
    expect(report.outcomes[0]!.state).toBe("already_completed");
  });

  it("on a byte-delete failure leaves the row intact and marks it failed_retryable", async () => {
    if (!reachable) return;
    const x = await seed({ withBytes: true });
    const cx = await candidateFor(x.id);
    const manifest = buildManifest([cx], [], fingerprint, "t");

    // A storage adapter whose delete always throws — the row must survive.
    const failing: StorageAdapter = {
      ...storage,
      delete: async () => {
        throw new Error("simulated disk failure");
      },
    };

    const report = await executeManifest(manifest, manifest.digest, failing, prisma);

    expect(report.outcomes[0]!.state).toBe("failed_retryable");
    expect(report.outcomes[0]!.reason).toContain("simulated disk failure");
    expect(await rowExists(x.id)).toBe(true); // bytes-first: row never deleted when bytes fail
    expect(await storage.exists(storageKey(x.storageKey))).toBe(true);

    // A subsequent retry with a working adapter completes it (idempotent).
    const retry = await executeManifest(manifest, computeDigest(manifest.target, manifest.candidates), storage);
    expect(retry.outcomes[0]!.state).toBe("deleted");
    expect(await rowExists(x.id)).toBe(false);
  });
});

describe("executeManifest — target fingerprint binding", () => {
  it("refuses to run a manifest sealed against a different cluster (system_identifier)", async () => {
    if (!reachable) return;
    const x = await seed({ withBytes: true });
    const cx = await candidateFor(x.id);
    // Same DB name, DIFFERENT cluster identity — the exact "right name, wrong
    // instance" case name-only binding would miss.
    const wrongCluster = { ...fingerprint, systemIdentifier: "0000000000000000000" };
    const manifest = buildManifest([cx], [], wrongCluster, "t");
    await expect(executeManifest(manifest, manifest.digest, storage)).rejects.toThrow(/does not match the manifest target/);
    expect(await rowExists(x.id)).toBe(true); // nothing deleted
  });
});
