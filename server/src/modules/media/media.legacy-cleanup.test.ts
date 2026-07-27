/**
 * WI-5 legacy-cleanup — unit tests (no database).
 *
 * Covers the pure safety logic: predicate classification, the canonical/
 * deterministic digest (over target ∥ candidates), manifest sealing, the sanitized
 * review report (no tokens/storage keys), the terminal gate, and executeManifest's
 * refusal guards (digest / confirm / DB fingerprint) — which reject before any write.
 */

import { describe, expect, it } from "vitest";

import {
  buildManifest,
  buildReviewReport,
  classify,
  computeDigest,
  evaluateGate,
  executeManifest,
  withExecution,
  type CleanupManifest,
  type EvidenceRow,
  type LegacyCandidate,
  type RunReport,
  type TargetFingerprint,
} from "./media.legacy-cleanup";
import type { StorageAdapter } from "./media.types";

const target = (over: Partial<TargetFingerprint> = {}): TargetFingerprint => ({
  database: "quick_tweets",
  systemIdentifier: "7663888953841365004",
  databaseOid: "16387",
  serverAddr: "::1",
  serverPort: 5432,
  ...over,
});

const row = (over: Partial<EvidenceRow> = {}): EvidenceRow => ({
  id: 1,
  token: "tok",
  storageKey: "objects/x",
  size: 10,
  status: "ready",
  grantId: "g",
  grantExpiresAt: new Date("2026-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ledgerRefs: 0,
  tweetRefs: 0,
  commentRefs: 0,
  avatarRefs: 0,
  quarOpen: 0,
  quarResolved: 0,
  ...over,
});

const cand = (over: Partial<LegacyCandidate> = {}): LegacyCandidate => ({
  id: 1,
  token: "tok",
  storageKey: "objects/x",
  size: 10,
  status: "ready",
  grantId: "g",
  grantExpiresAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  refs: { ledger: 0, tweet: 0, comment: 0, avatar: 0 },
  quarantine: { open: 0, resolved: 0 },
  bytesPresent: true,
  ...over,
});

describe("classify — predicates P2–P6", () => {
  it("a clean grant-provenance unreferenced row is a candidate", () => {
    expect(classify(row(), true).kind).toBe("candidate");
  });

  it("status 'deleted' is allowed; grant provenance via expiry alone suffices", () => {
    expect(classify(row({ status: "deleted" }), false).kind).toBe("candidate");
    expect(classify(row({ grantId: null }), true).kind).toBe("candidate"); // grantExpiresAt still set
  });

  it.each([
    ["no provenance", { grantId: null, grantExpiresAt: null }, "no_grant_provenance"],
    ["bad status", { status: "pending" }, "bad_status:pending"],
    ["ledger reference", { ledgerRefs: 1 }, "ledger_referenced:1"],
    ["tweet reference", { tweetRefs: 1 }, "feature_referenced"],
    ["comment reference", { commentRefs: 2 }, "feature_referenced"],
    ["avatar reference", { avatarRefs: 1 }, "feature_referenced"],
    ["open quarantine", { quarOpen: 1 }, "open_quarantine:1"],
    ["resolved quarantine (still FK-blocks)", { quarResolved: 1 }, "resolved_quarantine_present:1"],
  ])("anomaly: %s", (_label, over, reasonFragment) => {
    const result = classify(row(over as Partial<EvidenceRow>), true);
    expect(result.kind).toBe("anomaly");
    if (result.kind === "anomaly") expect(result.anomaly.reasons.join(",")).toContain(reasonFragment);
  });

  it("collects every failing reason at once", () => {
    const result = classify(row({ grantId: null, grantExpiresAt: null, ledgerRefs: 1, quarOpen: 1 }), true);
    expect(result.kind).toBe("anomaly");
    if (result.kind === "anomaly") expect(result.anomaly.reasons).toHaveLength(3);
  });
});

describe("computeDigest — canonical & deterministic (target ∥ candidates)", () => {
  const a = cand({ id: 1 });
  const b = cand({ id: 2, token: "tok2", storageKey: "objects/y" });

  it("is independent of candidate input (DB row) order", () => {
    expect(computeDigest(target(), [a, b])).toBe(computeDigest(target(), [b, a]));
  });

  it("changes when any candidate evidence changes", () => {
    const base = computeDigest(target(), [cand()]);
    expect(computeDigest(target(), [cand({ bytesPresent: false })])).not.toBe(base);
    expect(computeDigest(target(), [cand({ size: 11 })])).not.toBe(base);
    expect(computeDigest(target(), [cand({ status: "deleted" })])).not.toBe(base);
    expect(computeDigest(target(), [cand({ refs: { ledger: 1, tweet: 0, comment: 0, avatar: 0 } })])).not.toBe(base);
  });

  it("changes when a stable target component changes (name / system_identifier / oid)", () => {
    const base = computeDigest(target(), [cand()]);
    expect(computeDigest(target({ database: "other" }), [cand()])).not.toBe(base);
    expect(computeDigest(target({ systemIdentifier: "9999" }), [cand()])).not.toBe(base);
    expect(computeDigest(target({ databaseOid: "42" }), [cand()])).not.toBe(base);
  });

  it("excludes informational serverAddr/port from the seal", () => {
    const base = computeDigest(target(), [cand()]);
    expect(computeDigest(target({ serverAddr: "10.0.0.9", serverPort: 6000 }), [cand()])).toBe(base);
  });

  it("is stable across repeated calls and for the empty set", () => {
    expect(computeDigest(target(), [cand()])).toBe(computeDigest(target(), [cand()]));
    expect(computeDigest(target(), [])).toBe(computeDigest(target(), []));
  });
});

describe("buildManifest", () => {
  it("seals the digest over target ∥ candidates and excludes volatile generatedAt", () => {
    const m1 = buildManifest([cand()], [], target(), "2026-07-27T00:00:00.000Z");
    const m2 = buildManifest([cand()], [], target(), "2030-01-01T09:09:09.000Z");
    expect(m1.digest).toBe(m2.digest);
    expect(m1.digest).toBe(computeDigest(target(), [cand()]));
  });

  it("orders candidates by id ascending", () => {
    const m = buildManifest(
      [cand({ id: 9, token: "t9", storageKey: "objects/9" }), cand({ id: 2, token: "t2", storageKey: "objects/2" })],
      [],
      target(),
      "t",
    );
    expect(m.candidates.map((c) => c.id)).toEqual([2, 9]);
  });
});

describe("buildReviewReport — sanitized, tokenless durable evidence", () => {
  const secretCand = cand({ id: 3, token: "SECRET_TOKEN_VALUE", storageKey: "objects/SECRET_STORAGE_KEY" });
  const manifest = buildManifest([secretCand], [], target(), "2026-07-27T00:00:00.000Z");
  const review = buildReviewReport(manifest);

  it("references the sealed manifest digest and target — not a recreated set", () => {
    expect(review.manifestDigest).toBe(manifest.digest);
    expect(review.target).toEqual(target());
    expect(review.candidateCount).toBe(1);
  });

  it("records id + proof facts but NO token and NO storage key", () => {
    const json = JSON.stringify(review);
    expect(json).not.toContain("SECRET_TOKEN_VALUE");
    expect(json).not.toContain("SECRET_STORAGE_KEY");
    expect(review.candidates[0]).toMatchObject({ id: 3, size: 10, status: "ready", grantProvenance: true, bytesPresent: true, proof: "genuine_legacy_garbage" });
    expect(review.execution).toBeNull();
  });

  it("folds an execution outcome into the durable report", () => {
    const run: RunReport = {
      target: target(),
      manifestDigest: manifest.digest,
      outcomes: [{ id: 3, state: "deleted" }],
      nullOwnerCountAfter: 0,
      coverageComplete: true,
      clean: true,
      gateComplete: true,
    };
    const updated = withExecution(review, run, "2026-07-28T00:00:00.000Z");
    expect(updated.execution).toEqual({
      ranAt: "2026-07-28T00:00:00.000Z",
      outcomes: [{ id: 3, state: "deleted" }],
      nullOwnerCountAfter: 0,
      gateComplete: true,
    });
  });
});

// A storage adapter that is never actually reached in these refusal tests.
const okStorage: StorageAdapter = {
  save: async () => {},
  createReadStream: async () => ({}) as never,
  exists: async () => true,
  delete: async () => {},
  enumerate: async () => [],
};

/** Minimal db stub returning a live fingerprint; refusals reject before any write. */
const dbStub = (fp: Partial<TargetFingerprint> = {}) =>
  ({
    $queryRawUnsafe: async () => [
      {
        database: "quick_tweets",
        systemIdentifier: "7663888953841365004",
        databaseOid: "16387",
        serverAddr: "::1",
        serverPort: 5432,
        ...fp,
      },
    ],
  }) as unknown as Parameters<typeof executeManifest>[3];

describe("executeManifest — refusal guards (no writes)", () => {
  const manifest = buildManifest([cand()], [], target(), "t");

  it("refuses when the --confirm digest does not match", async () => {
    await expect(executeManifest(manifest, "not-the-digest", okStorage, dbStub())).rejects.toThrow(
      /confirm digest does not match/,
    );
  });

  it("refuses a tampered manifest (digest ≠ its target+candidate set)", async () => {
    const tampered = { ...manifest, candidates: [cand({ size: 999 })] } as CleanupManifest;
    await expect(executeManifest(tampered, tampered.digest, okStorage, dbStub())).rejects.toThrow(
      /does not match its target\+candidate set/,
    );
  });

  it.each([
    ["system_identifier", { systemIdentifier: "0000000000000000000" }],
    ["database name", { database: "quick_tweets_staging" }],
    ["database oid", { databaseOid: "99999" }],
  ])("refuses when the live %s differs from the manifest target", async (_label, liveOver) => {
    await expect(executeManifest(manifest, manifest.digest, okStorage, dbStub(liveOver))).rejects.toThrow(
      /does not match the manifest target/,
    );
  });

  it("proceeds past the guards when confirm + digest + fingerprint all match (reaches candidate processing)", async () => {
    // Same fingerprint as the manifest target ⇒ guards pass; candidate processing
    // then runs against the stub, whose $transaction is undefined → throws, which
    // processCandidate maps to failed_retryable (not a guard rejection).
    const runReport = await executeManifest(manifest, manifest.digest, okStorage, dbStub());
    expect(runReport.outcomes[0]!.state).toBe("failed_retryable");
  });
});

describe("evaluateGate — terminal completion", () => {
  const m = buildManifest(
    [cand({ id: 1 }), cand({ id: 2, token: "t2", storageKey: "objects/2" })],
    [],
    target(),
    "t",
  );

  it("completes only when every candidate resolved and COUNT = 0", () => {
    expect(
      evaluateGate(m, [{ id: 1, state: "deleted" }, { id: 2, state: "already_completed" }], 0),
    ).toEqual({ coverageComplete: true, clean: true, gateComplete: true });
  });

  it("is incomplete when a candidate drifted or failed", () => {
    expect(evaluateGate(m, [{ id: 1, state: "deleted" }, { id: 2, state: "drift_halted" }], 0).gateComplete).toBe(false);
    expect(evaluateGate(m, [{ id: 1, state: "deleted" }, { id: 2, state: "failed_retryable" }], 0).gateComplete).toBe(false);
  });

  it("is incomplete when residual NULL-owner rows remain (count > 0)", () => {
    const g = evaluateGate(m, [{ id: 1, state: "deleted" }, { id: 2, state: "deleted" }], 3);
    expect(g.clean).toBe(false);
    expect(g.gateComplete).toBe(false);
  });

  it("is incomplete when an outcome is missing (coverage gap)", () => {
    const g = evaluateGate(m, [{ id: 1, state: "deleted" }], 0);
    expect(g.coverageComplete).toBe(false);
    expect(g.gateComplete).toBe(false);
  });
});
