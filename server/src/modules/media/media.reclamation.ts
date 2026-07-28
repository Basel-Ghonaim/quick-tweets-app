/**
 * Media reclamation — the collector that runs on the M10 scheduler (M11).
 *
 * One pass: select the two garbage classes from the registry, check each against
 * storage, classify divergences, and account for it. **Report-only in this Work
 * Item** — this pass mutates nothing (it neither tombstones a row nor deletes a
 * byte). The destructive branch (tombstone + byte delete under the row lock) is
 * added *dark* in a later commit, gated on `mode === "destructive"`, which is
 * never enabled here.
 *
 * Everything is computed from Media's own state (ADR 0005 Decision 8): the
 * registry (`media_objects` + its own `media_references`) and the byte store.
 * No feature schema is ever read — that boundary is what pre-enablement
 * verification protects, and reintroducing it here would defeat the whole design.
 *
 * Divergences (Decision 8, invariant 3) are never reclaimed on divergence alone:
 * - **row-without-bytes** — a `ready` candidate whose bytes are already gone;
 * - **orphan-bytes** — a stored key with no registry row at all.
 * Both are counted here and (in a later commit) flagged for review, never deleted.
 *
 * Distinct from a divergence: a **tombstoned row whose bytes still linger** (a
 * crashed/failed post-commit delete) is *retryable cleanup*, not garbage to
 * quarantine — it is **recovered** (an idempotent byte re-delete, the tombstone
 * retained), never deleted-as-a-row and never quarantined (#356).
 */

import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import type { StorageAdapter } from "./media.types.js";
import {
  createReclamationRepository,
  type AuditOutcome,
  type IReclamationRepository,
  type ReclaimCandidate,
  type ReclamationAuditRow,
} from "./media.reclamation.repository.js";

/** report = identify + account, mutate nothing. destructive = also physically reclaim. */
export type ReclamationMode = "report" | "destructive";

/** What one reclamation pass found (and, in destructive mode, did). */
export interface ReclamationReport {
  mode: ReclamationMode;
  scannedAt: Date;
  /** Eligible unreferenced-owned garbage (intact bytes — the would-reclaim set). */
  eligibleUnreferenced: number;
  wouldReclaimBytes: number;
  /** Divergences — never reclaimed on divergence alone. */
  rowWithoutBytes: number;
  orphanBytes: number;
  /** Actually reclaimed this pass — always 0 in report mode. */
  reclaimed: number;
  /** Divergences flagged for review this pass. */
  quarantined: number;
  /** Tombstoned rows whose bytes still linger — recovery backlog (#356). */
  recoverable: number;
  /** Lingering byte-sets actually re-deleted this pass — always 0 in report mode. */
  recovered: number;
}

export interface ReclamationDeps {
  /** The byte store to reconcile against — injected (the job wiring supplies the configured adapter). */
  storage: StorageAdapter;
  /** Grace window applied to unreferenced-owned candidates (ms from `created_at`). */
  graceMs: number;
  /** Max objects examined per pass (the single-recovery-unit batch bound). */
  batch: number;
  /** report (default everywhere) | destructive. */
  mode: ReclamationMode;
  repo?: IReclamationRepository;
  runInTransaction?: RunInTransaction;
  now?: () => Date;
  log?: (line: string) => void;
}

/** Run one reclamation pass. Report-only: nothing is mutated. */
export const runReclamation = async (deps: ReclamationDeps): Promise<ReclamationReport> => {
  const repo = deps.repo ?? createReclamationRepository();
  const now = (deps.now ?? (() => new Date()))();
  const log = deps.log ?? ((line: string) => console.log(line));
  const olderThan = new Date(now.getTime() - deps.graceMs);

  // 1. Select — registry-only. Reclamation has a single garbage class,
  //    unreferenced-owned (the abandoned-grant class was retired with the pre-auth
  //    grant, ADR 0008).
  const unreferenced = await repo.findUnreferencedOwned(olderThan, deps.batch);
  const candidates: ReclaimCandidate[] = [...unreferenced];

  // 2. Integrity — partition candidates into intact vs a row-without-bytes
  //    divergence (ready row, no bytes), never reclaimed on divergence alone.
  const intact: ReclaimCandidate[] = [];
  const rowWithoutBytes: ReclaimCandidate[] = [];
  for (const candidate of candidates) {
    if (await deps.storage.exists(candidate.storageKey)) intact.push(candidate);
    else rowWithoutBytes.push(candidate);
  }

  // 3. Orphan bytes — stored keys with no registry row at all. (Bounded by store
  //    size; at large scale this becomes a chunked reconcile — noted, not silently
  //    capped, so a future bound would be logged rather than hidden.)
  const storedKeys = await deps.storage.enumerate();
  const withRow = await repo.keysWithRow(storedKeys);
  const orphanKeys = storedKeys.filter((key) => !withRow.has(key));

  // 3b. Recovery backlog — tombstoned rows (already reclaimed in the registry)
  //     whose bytes still linger after a crashed/failed post-commit delete (#356).
  //     Retryable cleanup, not a divergence: the tombstone is retained; only the
  //     bytes are re-deleted. Store-scoped (a byte only lingers if it is in the
  //     store), so a drained tombstone never re-appears; bounded per pass by `batch`.
  const lingering = (await repo.findLingeringTombstones(storedKeys)).slice(0, deps.batch);

  const wouldReclaimBytes = intact.reduce((sum, c) => sum + c.size, 0);
  const destructive = deps.mode === "destructive";

  // 4. Reclaim — DARK. Only in destructive mode; report skips this branch and
  //    mutates no media state. Each object is its own recovery unit: lock +
  //    re-check + tombstone in one transaction, then delete bytes (tombstone
  //    before bytes; idempotent). A per-object failure is isolated and logged.
  const reclaimedIds = new Set<number>();
  const recoveredIds = new Set<number>();
  if (destructive) {
    const runInTransaction = deps.runInTransaction ?? defaultRunInTransaction;
    for (const candidate of intact) {
      try {
        const tombstoned = await runInTransaction((tx) =>
          repo.tombstoneIfReclaimable(candidate.id, tx),
        );
        if (tombstoned) {
          await deps.storage.delete(candidate.storageKey);
          reclaimedIds.add(candidate.id);
        }
      } catch (err) {
        log(`[jobs] media-reclamation — object ${candidate.id} failed to reclaim: ${String(err)}`);
      }
    }
    // Recover lingering bytes — the row is already tombstoned, so this is a bare
    // idempotent byte delete (no lock, no tombstone). A per-object failure is
    // isolated and simply stays backlog for the next pass (crash-safe, #356).
    for (const tombstone of lingering) {
      try {
        await deps.storage.delete(tombstone.storageKey);
        recoveredIds.add(tombstone.id);
      } catch (err) {
        log(
          `[jobs] media-reclamation — tombstone ${tombstone.id} bytes failed to recover: ${String(err)}`,
        );
      }
    }
    // Open the review queue for divergences (destructive only touches the queue;
    // report surfaces them in the audit trail without opening rows).
    await repo.openQuarantine([
      ...rowWithoutBytes.map((c) => ({
        mediaId: c.id, storageKey: c.storageKey as string, kind: "row_without_bytes" as const, detail: "", detectedAt: now,
      })),
      ...orphanKeys.map((key) => ({
        mediaId: null, storageKey: key as string, kind: "orphan_bytes" as const, detail: "", detectedAt: now,
      })),
    ]);
  }

  // 5. Audit trail — written in BOTH modes (the soak's durable evidence base).
  //    Report records the "would_" outcomes; destructive records what it did.
  const auditRows: ReclamationAuditRow[] = [
    ...(destructive ? intact.filter((c) => reclaimedIds.has(c.id)) : intact).map((c) => ({
      mediaId: c.id,
      storageKey: c.storageKey as string,
      reason: c.reason,
      outcome: (destructive ? "reclaimed" : "would_reclaim") as AuditOutcome,
      bytes: c.size,
      mode: deps.mode,
      runAt: now,
    })),
    ...rowWithoutBytes.map((c) => ({
      mediaId: c.id,
      storageKey: c.storageKey as string,
      reason: "row_without_bytes",
      outcome: (destructive ? "quarantined" : "would_quarantine") as AuditOutcome,
      bytes: c.size,
      mode: deps.mode,
      runAt: now,
    })),
    ...orphanKeys.map((key) => ({
      mediaId: null,
      storageKey: key as string,
      reason: "orphan_bytes",
      outcome: (destructive ? "quarantined" : "would_quarantine") as AuditOutcome,
      bytes: 0,
      mode: deps.mode,
      runAt: now,
    })),
    // Recovery backlog — retryable cleanup, not a divergence (#356). Report records
    // the would-recover intent; destructive records only the bytes it re-deleted.
    ...(destructive ? lingering.filter((t) => recoveredIds.has(t.id)) : lingering).map((t) => ({
      mediaId: t.id,
      storageKey: t.storageKey as string,
      reason: "lingering_bytes",
      outcome: (destructive ? "recovered" : "would_recover") as AuditOutcome,
      bytes: t.size,
      mode: deps.mode,
      runAt: now,
    })),
  ];
  await repo.recordAudit(auditRows);

  const reclaimed = reclaimedIds.size;
  const recovered = recoveredIds.size;
  const quarantined = rowWithoutBytes.length + orphanKeys.length;

  const report: ReclamationReport = {
    mode: deps.mode,
    scannedAt: now,
    eligibleUnreferenced: unreferenced.length,
    wouldReclaimBytes,
    rowWithoutBytes: rowWithoutBytes.length,
    orphanBytes: orphanKeys.length,
    reclaimed,
    quarantined,
    recoverable: lingering.length,
    recovered,
  };

  log(
    `[jobs] media-reclamation (${report.mode}) — ` +
      `unreferenced=${report.eligibleUnreferenced} ` +
      `wouldReclaimBytes=${report.wouldReclaimBytes} ` +
      `rowWithoutBytes=${report.rowWithoutBytes} orphanBytes=${report.orphanBytes} ` +
      `reclaimed=${report.reclaimed} quarantined=${report.quarantined} ` +
      `recoverable=${report.recoverable} recovered=${report.recovered}`,
  );
  return report;
};
