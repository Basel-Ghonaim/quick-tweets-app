/**
 * WI-5 — bounded, one-time legacy `uploader_id IS NULL` cleanup (ADR 0008 D12).
 *
 * A migration tool, NOT the M11 reclamation path and NOT a schema migration. It
 * drives `COUNT(uploader_id IS NULL) = 0` so WI-7 can add `NOT NULL`, by removing
 * genuine legacy grant-provenance garbage — proven per candidate, approved as an
 * exact **manifest** set, deleted idempotently under the attach path's own
 * `FOR UPDATE` serialization.
 *
 * Safety model (see #367):
 * - REPORT is read-only: it selects candidates + anomalies and seals the exact
 *   candidate set — together with a strong **target fingerprint** — into a
 *   manifest with a deterministic SHA-256 digest.
 * - EXECUTE is **manifest-bound**: it operates only on the manifest's candidates
 *   (never re-queries for the set), requires the digest AND the live target
 *   fingerprint to match, and re-validates every candidate live under `FOR UPDATE`
 *   immediately before deletion — any drift HALTS that candidate, never expands
 *   the set.
 * - Deletion is **bytes-first then row**, holding the row lock across the byte
 *   delete so nothing can reference/quarantine the candidate in between; the
 *   `Restrict` FK is the final backstop, not the primary authorization.
 *
 * Artifacts split (sensitive vs shareable):
 * - the **sensitive manifest** (gitignored) carries the exact values execution
 *   needs (incl. token/storageKey) and the sealing digest;
 * - the **sanitized review report** carries only non-sensitive proof facts
 *   (ids, counts, verdicts) plus the digest + target fingerprint, so the human
 *   approval leaves durable, tokenless audit evidence.
 *
 * Internal to the module; never exported from `index.ts`.
 */

import { createHash } from "node:crypto";

import { prisma } from "../../shared/database/index.js";
import { storageKey } from "./media.keys.js";
import type { StorageAdapter } from "./media.types.js";

type PrismaInstance = typeof prisma;

/** Tool identity recorded in artifacts (bump on a predicate/format change). */
export const TOOL = "legacy-null-owner-cleanup" as const;
export const TOOL_VERSION = "wi5.1" as const;
export const PREDICATE_VERSION = 1 as const;

// ─── Types ───────────────────────────────────────────────────────────────────

/** A `uploader_id IS NULL` row with the full evidence the proof predicates need. */
export interface EvidenceRow {
  id: number;
  token: string;
  storageKey: string;
  size: number;
  status: string;
  grantId: string | null;
  grantExpiresAt: Date | null;
  createdAt: Date;
  ledgerRefs: number;
  tweetRefs: number;
  commentRefs: number;
  avatarRefs: number;
  quarOpen: number;
  quarResolved: number;
}

/** A candidate proven to be genuine legacy garbage (all predicates hold). */
export interface LegacyCandidate {
  id: number;
  token: string;
  storageKey: string;
  size: number;
  status: string;
  grantId: string | null;
  grantExpiresAt: string | null; // ISO-8601 UTC or null
  createdAt: string; // ISO-8601 UTC
  refs: { ledger: number; tweet: number; comment: number; avatar: number };
  quarantine: { open: number; resolved: number };
  bytesPresent: boolean;
}

/** A `uploader_id IS NULL` row that is NOT clean garbage — reported, never deleted. */
export interface LegacyAnomaly {
  id: number;
  status: string;
  reasons: string[];
  refs: { ledger: number; tweet: number; comment: number; avatar: number };
  quarantine: { open: number; resolved: number };
}

/**
 * A strong, non-secret identity for the target database. `database` alone (the
 * name) is not instance-unique — different Postgres instances can share a name —
 * so the **cluster `systemIdentifier`** (initdb-generated, stable across restarts)
 * plus the database OID pin the exact instance+database. `serverAddr`/`serverPort`
 * are informational only (null on socket connections; not part of the gate).
 */
export interface TargetFingerprint {
  database: string;
  systemIdentifier: string;
  databaseOid: string;
  serverAddr: string | null;
  serverPort: number | null;
}

/** The sealed, reviewable candidate set. `digest` covers (stable target ∥ candidates). */
export interface CleanupManifest {
  version: 1;
  tool: typeof TOOL;
  toolVersion: string;
  predicateVersion: number;
  target: TargetFingerprint;
  generatedAt: string; // recorded, NOT hashed
  candidates: LegacyCandidate[];
  anomalies: LegacyAnomaly[];
  digest: string; // sha256 hex over stable-target ∥ ordered candidate set
}

export type OutcomeState = "deleted" | "already_completed" | "drift_halted" | "failed_retryable";

export interface CandidateOutcome {
  id: number;
  state: OutcomeState;
  reason?: string;
}

export interface RunReport {
  target: TargetFingerprint;
  manifestDigest: string;
  outcomes: CandidateOutcome[];
  nullOwnerCountAfter: number;
  coverageComplete: boolean; // A — every manifest candidate has exactly one outcome
  clean: boolean; // B — COUNT(uploader_id IS NULL) === 0
  gateComplete: boolean; // A ∧ all outcomes deleted/already_completed ∧ B
}

/** Sanitized per-candidate proof facts — NO token, NO storageKey. */
export interface ReviewCandidate {
  id: number;
  size: number;
  status: string;
  grantProvenance: boolean;
  refs: { ledger: number; tweet: number; comment: number; avatar: number };
  quarantine: { open: number; resolved: number };
  bytesPresent: boolean;
  proof: "genuine_legacy_garbage";
}

export interface ReviewExecution {
  ranAt: string;
  outcomes: CandidateOutcome[];
  nullOwnerCountAfter: number;
  gateComplete: boolean;
}

/**
 * Durable, shareable review evidence: identifies the approved set by id + proof
 * facts only (no reusable tokens/storage identifiers), and **references** the
 * sensitive manifest's `digest` — it never recreates a different approval set.
 */
export interface ReviewReport {
  tool: typeof TOOL;
  version: string;
  generatedAt: string;
  target: TargetFingerprint;
  manifestDigest: string;
  candidateCount: number;
  candidates: ReviewCandidate[];
  anomalies: LegacyAnomaly[]; // already tokenless (id + reasons + counts)
  execution: ReviewExecution | null;
}

/** Raised when the byte delete fails — the row is left intact and retryable. */
class BytesDeleteFailed extends Error {}

// ─── Target fingerprint (read-only) ──────────────────────────────────────────

/**
 * Read the strong, non-secret target identity. Fails loudly if the cluster
 * `system_identifier` cannot be read (e.g. insufficient role) — an irreversible
 * tool must never silently fall back to name-only binding.
 */
export const readFingerprint = async (db: PrismaInstance = prisma): Promise<TargetFingerprint> => {
  try {
    const [row] = await db.$queryRawUnsafe<
      { database: string; systemIdentifier: string; databaseOid: string; serverAddr: string | null; serverPort: number | null }[]
    >(`
      SELECT
        current_database()                                                            AS database,
        (SELECT oid::text FROM pg_database WHERE datname = current_database())         AS "databaseOid",
        (SELECT system_identifier::text FROM pg_control_system())                      AS "systemIdentifier",
        host(inet_server_addr())                                                       AS "serverAddr",
        inet_server_port()                                                             AS "serverPort"
    `);
    if (!row || !row.systemIdentifier) {
      throw new Error("system_identifier unavailable");
    }
    return {
      database: row.database,
      systemIdentifier: row.systemIdentifier,
      databaseOid: row.databaseOid,
      serverAddr: row.serverAddr,
      serverPort: row.serverPort === null ? null : Number(row.serverPort),
    };
  } catch (err) {
    throw new Error(
      `could not read the target database fingerprint (system_identifier via pg_control_system): ${
        err instanceof Error ? err.message : String(err)
      }. Run the cleanup with a role permitted to read cluster identity; refusing to proceed without a strong DB fingerprint.`,
    );
  }
};

/** The three stable components that constitute the hard identity gate. */
const stableIdentity = (t: TargetFingerprint): [string, string, string] => [t.database, t.systemIdentifier, t.databaseOid];

/** Which stable components differ between two fingerprints (empty ⇒ same instance). */
const fingerprintMismatches = (a: TargetFingerprint, b: TargetFingerprint): string[] => {
  const diffs: string[] = [];
  if (a.database !== b.database) diffs.push(`database(${a.database}≠${b.database})`);
  if (a.systemIdentifier !== b.systemIdentifier) diffs.push(`systemIdentifier(${a.systemIdentifier}≠${b.systemIdentifier})`);
  if (a.databaseOid !== b.databaseOid) diffs.push(`databaseOid(${a.databaseOid}≠${b.databaseOid})`);
  return diffs;
};

// ─── Selection & classification (read-only) ──────────────────────────────────

const SELECT_NULL_OWNER = `
  SELECT
    m.id, m.token, m.storage_key AS "storageKey", m.size, m.status,
    m.grant_id AS "grantId", m.grant_expires_at AS "grantExpiresAt", m.created_at AS "createdAt",
    (SELECT count(*)::int FROM media_references r  WHERE r.media_id = m.id)                          AS "ledgerRefs",
    (SELECT count(*)::int FROM tweet_media tm      WHERE tm.media_id = m.id)                         AS "tweetRefs",
    (SELECT count(*)::int FROM comments c          WHERE c.media_id = m.id)                          AS "commentRefs",
    (SELECT count(*)::int FROM users u             WHERE u.avatar_media_id = m.id)                    AS "avatarRefs",
    (SELECT count(*)::int FROM media_quarantine q  WHERE q.media_id = m.id AND q.resolved_at IS NULL) AS "quarOpen",
    (SELECT count(*)::int FROM media_quarantine q  WHERE q.media_id = m.id AND q.resolved_at IS NOT NULL) AS "quarResolved"
  FROM media_objects m
  WHERE m.uploader_id IS NULL
  ORDER BY m.id ASC
`;

/**
 * Classify one `uploader_id IS NULL` row (P1 is the selection filter). A row is a
 * clean candidate iff ALL hold: P2 grant provenance present; P3 status ∈
 * {ready,deleted}; P4 no Media-ledger reference; P5 no feature reference
 * (tweet/comment/avatar); P6 no quarantine row at all (open **or** resolved — a
 * resolved quarantine still `Restrict`-blocks the hard delete). Anything else is
 * an anomaly: reported, never deleted.
 */
export const classify = (
  row: EvidenceRow,
  bytesPresent: boolean,
): { kind: "candidate"; candidate: LegacyCandidate } | { kind: "anomaly"; anomaly: LegacyAnomaly } => {
  const reasons: string[] = [];
  if (row.grantId === null && row.grantExpiresAt === null) reasons.push("no_grant_provenance");
  if (row.status !== "ready" && row.status !== "deleted") reasons.push(`bad_status:${row.status}`);
  if (row.ledgerRefs > 0) reasons.push(`ledger_referenced:${row.ledgerRefs}`);
  if (row.tweetRefs > 0 || row.commentRefs > 0 || row.avatarRefs > 0) {
    reasons.push(`feature_referenced:t${row.tweetRefs}/c${row.commentRefs}/a${row.avatarRefs}`);
  }
  if (row.quarOpen > 0) reasons.push(`open_quarantine:${row.quarOpen}`);
  if (row.quarResolved > 0) reasons.push(`resolved_quarantine_present:${row.quarResolved}`);

  const refs = { ledger: row.ledgerRefs, tweet: row.tweetRefs, comment: row.commentRefs, avatar: row.avatarRefs };
  const quarantine = { open: row.quarOpen, resolved: row.quarResolved };

  if (reasons.length > 0) {
    return { kind: "anomaly", anomaly: { id: row.id, status: row.status, reasons, refs, quarantine } };
  }
  return {
    kind: "candidate",
    candidate: {
      id: row.id,
      token: row.token,
      storageKey: row.storageKey,
      size: row.size,
      status: row.status,
      grantId: row.grantId,
      grantExpiresAt: row.grantExpiresAt ? row.grantExpiresAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      refs,
      quarantine,
      bytesPresent,
    },
  };
};

/** Read-only: select every `uploader_id IS NULL` row and split into candidates / anomalies. */
export const selectLegacy = async (
  storage: StorageAdapter,
  db: PrismaInstance = prisma,
): Promise<{ candidates: LegacyCandidate[]; anomalies: LegacyAnomaly[] }> => {
  const rows = await db.$queryRawUnsafe<EvidenceRow[]>(SELECT_NULL_OWNER);
  const candidates: LegacyCandidate[] = [];
  const anomalies: LegacyAnomaly[] = [];
  for (const row of rows) {
    const bytesPresent = await storage.exists(storageKey(row.storageKey));
    const result = classify(row, bytesPresent);
    if (result.kind === "candidate") candidates.push(result.candidate);
    else anomalies.push(result.anomaly);
  }
  return { candidates, anomalies };
};

// ─── Canonical manifest & digest ─────────────────────────────────────────────

/**
 * Positional (array) serialization with a FIXED field order — no object-key
 * ambiguity. Dates are already ISO strings; nulls are explicit.
 */
const canonicalCandidate = (c: LegacyCandidate): string =>
  JSON.stringify([
    c.id, c.token, c.storageKey, c.size, c.status, c.grantId, c.grantExpiresAt, c.createdAt,
    c.refs.ledger, c.refs.tweet, c.refs.comment, c.refs.avatar,
    c.quarantine.open, c.quarantine.resolved, c.bytesPresent,
  ]);

/**
 * SHA-256 over the **stable target identity** followed by the candidate set,
 * ordered by `id` ascending **in code** (never relying on DB row order). Volatile
 * metadata (generatedAt, informational serverAddr/port) is excluded, so the same
 * DB state on the same instance yields the same digest — determinism the reviewer
 * can verify — while a different instance (even same DB name) cannot reproduce it.
 */
export const computeDigest = (target: TargetFingerprint, candidates: LegacyCandidate[]): string => {
  const targetPart = JSON.stringify(stableIdentity(target));
  const candidatePart = [...candidates]
    .sort((a, b) => a.id - b.id)
    .map(canonicalCandidate)
    .join("\n");
  return createHash("sha256").update(`${targetPart}\n${candidatePart}`, "utf8").digest("hex");
};

export const buildManifest = (
  candidates: LegacyCandidate[],
  anomalies: LegacyAnomaly[],
  target: TargetFingerprint,
  generatedAt: string,
): CleanupManifest => ({
  version: 1,
  tool: TOOL,
  toolVersion: TOOL_VERSION,
  predicateVersion: PREDICATE_VERSION,
  target,
  generatedAt,
  candidates: [...candidates].sort((a, b) => a.id - b.id),
  anomalies: [...anomalies].sort((a, b) => a.id - b.id),
  digest: computeDigest(target, candidates),
});

/** Build the sanitized, shareable review report from a sealed manifest (no tokens/keys). */
export const buildReviewReport = (manifest: CleanupManifest): ReviewReport => ({
  tool: manifest.tool,
  version: manifest.toolVersion,
  generatedAt: manifest.generatedAt,
  target: manifest.target,
  manifestDigest: manifest.digest,
  candidateCount: manifest.candidates.length,
  candidates: manifest.candidates.map((c) => ({
    id: c.id,
    size: c.size,
    status: c.status,
    grantProvenance: c.grantId !== null || c.grantExpiresAt !== null,
    refs: c.refs,
    quarantine: c.quarantine,
    bytesPresent: c.bytesPresent,
    proof: "genuine_legacy_garbage",
  })),
  anomalies: manifest.anomalies,
  execution: null,
});

/** Fold an execution outcome into a review report — the durable "what happened". */
export const withExecution = (review: ReviewReport, run: RunReport, ranAt: string): ReviewReport => ({
  ...review,
  execution: {
    ranAt,
    outcomes: run.outcomes,
    nullOwnerCountAfter: run.nullOwnerCountAfter,
    gateComplete: run.gateComplete,
  },
});

// ─── Terminal gate (pure) ────────────────────────────────────────────────────

/**
 * The gate completes iff (A) every manifest candidate has exactly one outcome,
 * all resolved to `deleted`/`already_completed`, AND (B) `nullOwnerCount === 0`.
 * A drift_halted / failed_retryable candidate, or any residual NULL-owner row,
 * means the gate has NOT completed even though the tool behaved safely.
 */
export const evaluateGate = (
  manifest: CleanupManifest,
  outcomes: CandidateOutcome[],
  nullOwnerCount: number,
): { coverageComplete: boolean; clean: boolean; gateComplete: boolean } => {
  const ids = new Set(outcomes.map((o) => o.id));
  const coverageComplete =
    outcomes.length === manifest.candidates.length &&
    ids.size === manifest.candidates.length &&
    manifest.candidates.every((c) => ids.has(c.id));
  const allResolved = outcomes.every((o) => o.state === "deleted" || o.state === "already_completed");
  const clean = nullOwnerCount === 0;
  return { coverageComplete, clean, gateComplete: coverageComplete && allResolved && clean };
};

// ─── Execution (manifest-bound, destructive) ─────────────────────────────────

/**
 * Process one manifest candidate in its own transaction: lock `FOR UPDATE`,
 * re-validate all predicates live, then (only if still clean) delete **bytes
 * first, then row**, holding the lock throughout. Returns the deterministic
 * outcome. Never deletes a candidate that has drifted.
 */
const processCandidate = async (
  db: PrismaInstance,
  storage: StorageAdapter,
  candidate: LegacyCandidate,
): Promise<CandidateOutcome> => {
  try {
    return await db.$transaction(
      async (tx) => {
        const locked = await tx.$queryRawUnsafe<
          { id: number; status: string; uploader_id: number | null; grant_id: string | null; grant_expires_at: Date | null; storage_key: string }[]
        >(
          `SELECT id, status, uploader_id, grant_id, grant_expires_at, storage_key FROM media_objects WHERE id = $1 FOR UPDATE`,
          candidate.id,
        );
        if (locked.length === 0) {
          return { id: candidate.id, state: "already_completed" as const };
        }
        const row = locked[0]!;

        // Live re-validation under the lock — any drift HALTS this candidate.
        const reasons: string[] = [];
        if (row.uploader_id !== null) reasons.push("owner_set");
        if (row.grant_id === null && row.grant_expires_at === null) reasons.push("no_grant_provenance");
        if (row.status !== "ready" && row.status !== "deleted") reasons.push(`bad_status:${row.status}`);
        if (row.storage_key !== candidate.storageKey) reasons.push("storage_key_mismatch");

        const ledger = await tx.mediaReference.count({ where: { mediaId: candidate.id } });
        if (ledger > 0) reasons.push(`ledger_referenced:${ledger}`);
        const [tweet, comment, avatar, quar] = await Promise.all([
          tx.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM tweet_media WHERE media_id = $1`, candidate.id),
          tx.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM comments WHERE media_id = $1`, candidate.id),
          tx.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM users WHERE avatar_media_id = $1`, candidate.id),
          tx.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM media_quarantine WHERE media_id = $1`, candidate.id),
        ]);
        if (tweet[0]!.n > 0 || comment[0]!.n > 0 || avatar[0]!.n > 0) {
          reasons.push(`feature_referenced:t${tweet[0]!.n}/c${comment[0]!.n}/a${avatar[0]!.n}`);
        }
        if (quar[0]!.n > 0) reasons.push(`quarantine_present:${quar[0]!.n}`);

        if (reasons.length > 0) {
          return { id: candidate.id, state: "drift_halted" as const, reason: reasons.join(",") };
        }

        // Bytes-first, holding the lock. A byte-delete failure leaves the row
        // intact (rollback) — retryable. `rm` is idempotent, so a retry over
        // already-absent bytes still succeeds.
        try {
          await storage.delete(storageKey(candidate.storageKey));
        } catch (err) {
          throw new BytesDeleteFailed(err instanceof Error ? err.message : String(err));
        }

        // Row delete, guarded; the `Restrict` FK is the final backstop.
        const deleted = await tx.$executeRawUnsafe(
          `DELETE FROM media_objects WHERE id = $1 AND uploader_id IS NULL AND status = $2`,
          candidate.id,
          row.status,
        );
        if (deleted !== 1) {
          throw new Error(`expected to delete 1 row for id ${candidate.id}, deleted ${deleted}`);
        }
        return { id: candidate.id, state: "deleted" as const };
      },
      { timeout: 30_000 },
    );
  } catch (err) {
    // Bytes failure, an unexpected delete count, an FK backstop trip, or a commit
    // failure: the row is left intact (rolled back) and safe to retry.
    const reason = err instanceof Error ? err.message : String(err);
    return { id: candidate.id, state: "failed_retryable", reason };
  }
};

/**
 * Execute the approved manifest. Refuses unless the manifest's digest is internally
 * consistent, the operator-supplied `confirmDigest` matches it, and the **live
 * target fingerprint** (name + cluster system_identifier + database OID) matches
 * the manifest. Operates on the manifest's candidates **only** — a candidate
 * discovered after the manifest was sealed is never in the set and never touched.
 */
export const executeManifest = async (
  manifest: CleanupManifest,
  confirmDigest: string,
  storage: StorageAdapter,
  db: PrismaInstance = prisma,
): Promise<RunReport> => {
  const recomputed = computeDigest(manifest.target, manifest.candidates);
  if (recomputed !== manifest.digest) {
    throw new Error("manifest digest does not match its target+candidate set (tampered or stale manifest)");
  }
  if (confirmDigest !== manifest.digest) {
    throw new Error("--confirm digest does not match the manifest digest; refusing to execute");
  }

  const live = await readFingerprint(db);
  const diffs = fingerprintMismatches(live, manifest.target);
  if (diffs.length > 0) {
    throw new Error(`live database fingerprint does not match the manifest target [${diffs.join(", ")}]; refusing to execute`);
  }

  const outcomes: CandidateOutcome[] = [];
  for (const candidate of manifest.candidates) {
    outcomes.push(await processCandidate(db, storage, candidate));
  }

  const n = await countNullOwner(db);
  const gate = evaluateGate(manifest, outcomes, n);

  return {
    target: live,
    manifestDigest: manifest.digest,
    outcomes,
    nullOwnerCountAfter: n,
    coverageComplete: gate.coverageComplete,
    clean: gate.clean,
    gateComplete: gate.gateComplete,
  };
};

/** Read-only: current `COUNT(uploader_id IS NULL)` — the terminal precondition. */
export const countNullOwner = async (db: PrismaInstance = prisma): Promise<number> => {
  const [{ n }] = await db.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM media_objects WHERE uploader_id IS NULL`,
  );
  return n;
};
