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
 */

import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import type { StorageAdapter } from "./media.types.js";
import {
  createReclamationRepository,
  type IReclamationRepository,
  type ReclaimCandidate,
} from "./media.reclamation.repository.js";

/** report = identify + account, mutate nothing. destructive = also physically reclaim. */
export type ReclamationMode = "report" | "destructive";

/** What one reclamation pass found (and, in destructive mode, did). */
export interface ReclamationReport {
  mode: ReclamationMode;
  scannedAt: Date;
  /** Eligible garbage by class (intact bytes — the would-reclaim set). */
  eligibleAbandoned: number;
  eligibleUnreferenced: number;
  wouldReclaimBytes: number;
  /** Divergences — never reclaimed on divergence alone. */
  rowWithoutBytes: number;
  orphanBytes: number;
  /** Actually reclaimed this pass — always 0 in report mode. */
  reclaimed: number;
  /** Divergences flagged for review this pass. */
  quarantined: number;
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

  // 1. Select — registry-only.
  const abandoned = await repo.findAbandoned(now, deps.batch);
  const unreferenced = await repo.findUnreferencedOwned(olderThan, deps.batch);
  const candidates: ReclaimCandidate[] = [...abandoned, ...unreferenced];

  // 2. Integrity — a candidate whose bytes are already gone is a divergence
  //    (ready row, no bytes), never reclaimed on divergence alone.
  const intact: ReclaimCandidate[] = [];
  let rowWithoutBytes = 0;
  for (const candidate of candidates) {
    if (await deps.storage.exists(candidate.storageKey)) intact.push(candidate);
    else rowWithoutBytes += 1;
  }

  // 3. Orphan bytes — stored keys with no registry row at all. (Bounded by store
  //    size; at large scale this becomes a chunked reconcile — noted, not silently
  //    capped, so a future bound would be logged rather than hidden.)
  const storedKeys = await deps.storage.enumerate();
  const withRow = await repo.keysWithRow(storedKeys);
  const orphanBytes = storedKeys.reduce((n, key) => (withRow.has(key) ? n : n + 1), 0);

  const wouldReclaimBytes = intact.reduce((sum, c) => sum + c.size, 0);

  // 4. Reclaim — DARK. Only when explicitly in destructive mode; report mutates
  //    nothing (this branch is skipped entirely). Each object is its own recovery
  //    unit: lock + re-check + tombstone in one transaction, then delete bytes
  //    (tombstone before bytes; the delete is idempotent). A per-object failure
  //    is isolated and logged, so one bad object never blocks the rest.
  let reclaimed = 0;
  if (deps.mode === "destructive") {
    const runInTransaction = deps.runInTransaction ?? defaultRunInTransaction;
    for (const candidate of intact) {
      try {
        const tombstoned = await runInTransaction((tx) =>
          repo.tombstoneIfReclaimable(candidate.id, tx),
        );
        if (tombstoned) {
          await deps.storage.delete(candidate.storageKey);
          reclaimed += 1;
        }
      } catch (err) {
        log(`[jobs] media-reclamation — object ${candidate.id} failed to reclaim: ${String(err)}`);
      }
    }
  }

  const quarantined = rowWithoutBytes + orphanBytes;

  const report: ReclamationReport = {
    mode: deps.mode,
    scannedAt: now,
    eligibleAbandoned: abandoned.length,
    eligibleUnreferenced: unreferenced.length,
    wouldReclaimBytes,
    rowWithoutBytes,
    orphanBytes,
    reclaimed,
    quarantined,
  };

  log(
    `[jobs] media-reclamation (${report.mode}) — ` +
      `abandoned=${report.eligibleAbandoned} unreferenced=${report.eligibleUnreferenced} ` +
      `wouldReclaimBytes=${report.wouldReclaimBytes} ` +
      `rowWithoutBytes=${report.rowWithoutBytes} orphanBytes=${report.orphanBytes} ` +
      `reclaimed=${report.reclaimed} quarantined=${report.quarantined}`,
  );
  return report;
};
