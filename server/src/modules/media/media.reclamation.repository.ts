/**
 * Media reclamation — the registry-only selection query (M11).
 *
 * Reclamation finds the single garbage class from **Media's own state** (ADR 0005
 * Decision 8) and never reads a feature schema:
 *
 * - **Unreferenced-owned** — an owned object (`uploader_id` set) with no ledger
 *   row that has been settled past the grace window (`created_at < now − grace`).
 *   The grace covers the upload→first-attach compose gap — the only window in
 *   which a live-to-be object legitimately has no reference yet.
 *
 * (The abandoned-grant class was retired with the pre-auth grant — ADR 0008, WI-6.)
 * Selection excludes non-servable rows (`status <> 'ready'`, i.e. tombstones) and
 * anything still referenced (`references: none`) — the latter is Media's own
 * ledger relation, not a feature table. A dedicated interface (not a bolt-on to
 * `IMediaRepository`) keeps the attach/ingest surface stable and this concern SRP.
 *
 * Internal to the module; never exported from `index.ts`.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import { storageKey } from "./media.keys.js";
import type { StorageKey } from "./media.types.js";

type PrismaInstance = typeof prisma;

/** Why an object is a reclamation candidate — recorded on the audit trail (Step 5).
 *  Single class since the pre-auth grant was retired (ADR 0008). */
export type ReclaimReason = "unreferenced";

/**
 * A registry object eligible for reclamation. Carries only what the collector
 * needs: the id (to re-check and tombstone), the storage key (to check bytes /
 * delete), the size (for the report), and the class.
 */
export interface ReclaimCandidate {
  id: number;
  storageKey: StorageKey;
  size: number;
  reason: ReclaimReason;
}

/**
 * A tombstoned object (`status='deleted'`) whose bytes still linger after a
 * failed/crashed post-commit delete — retryable cleanup, not a divergence (#356).
 * Carries only what recovery needs: the id (to audit) plus the key and size (to
 * re-delete the bytes and account for them). The row itself is never touched:
 * the tombstone is permanently retained; only the lingering bytes are removed.
 */
export interface RecoverableTombstone {
  id: number;
  storageKey: StorageKey;
  size: number;
}

/** What happened to a candidate/divergence — report outcomes are the "would_" pair. */
export type AuditOutcome =
  | "would_reclaim"
  | "reclaimed"
  | "would_quarantine"
  | "quarantined"
  | "would_recover"
  | "recovered";

/** One append-only audit row — the durable evidence base for the soak review. */
export interface ReclamationAuditRow {
  mediaId: number | null;
  storageKey: string | null;
  reason: string; // unreferenced | row_without_bytes | orphan_bytes | lingering_bytes
                  // (historical rows may also carry the retired "abandoned" — see WI-8)
  outcome: AuditOutcome;
  bytes: number;
  mode: string; // report | destructive
  runAt: Date;
}

/** The two registry↔storage divergence kinds. */
export type QuarantineKind = "row_without_bytes" | "orphan_bytes";

/** A divergence to open for review (deduped against existing open rows). */
export interface QuarantineEntry {
  mediaId: number | null;
  storageKey: string | null;
  kind: QuarantineKind;
  detail: string;
  detectedAt: Date;
}

/** Reclamation's read surface over the registry — no feature schema, ever. */
export interface IReclamationRepository {
  /** Owned objects with no reference, older than `olderThan` (now − grace). Ascending id, capped at `limit`. */
  findUnreferencedOwned(olderThan: Date, limit: number, client?: DbClient): Promise<ReclaimCandidate[]>;
  /**
   * Which of `keys` have *any* registry row (any status). The divergence sweep
   * diffs the store against this to find **orphan bytes** — stored keys with no
   * row at all (a tombstoned row with lingering bytes is retryable cleanup, not
   * an orphan, so "any status" is deliberate).
   */
  keysWithRow(keys: string[], client?: DbClient): Promise<Set<string>>;
  /**
   * Tombstoned objects (`status='deleted'`) among `keys` — the live store
   * enumeration — whose bytes therefore still linger after a crashed/failed
   * post-commit delete (#356). The registry row is intentionally retained; this
   * is **retryable cleanup**, not a divergence: only the bytes are re-deleted.
   * Store-scoped by construction (a drained tombstone's key is absent from
   * `keys`), so clean tombstones are never re-examined. Registry-only. Ascending id.
   */
  findLingeringTombstones(keys: string[], client?: DbClient): Promise<RecoverableTombstone[]>;
  /**
   * Reclaim object `id` **within the caller's transaction**: lock it `FOR UPDATE`
   * (conflicting with the attach path's own `FOR UPDATE`, so the two serialize),
   * re-check under the lock that it is still `ready` **and** unreferenced, and if
   * so tombstone it (`status='deleted'`). Returns whether it tombstoned — `false`
   * means it lost the race (a reference began, or it was already reclaimed) and
   * must be left alone. The byte delete is the caller's, after commit (tombstone
   * before bytes). Registry-only; no feature schema.
   */
  tombstoneIfReclaimable(id: number, client: DbClient): Promise<boolean>;
  /** Append audit rows (both modes) — the soak's durable, queryable evidence base. */
  recordAudit(rows: ReclamationAuditRow[], client?: DbClient): Promise<void>;
  /** Open a review record for each divergence not already open (deduped). */
  openQuarantine(entries: QuarantineEntry[], client?: DbClient): Promise<void>;
}

const CANDIDATE_SELECT = { id: true, storageKey: true, size: true } as const;

export const createReclamationRepository = (
  db: PrismaInstance = prisma,
): IReclamationRepository => ({
  findUnreferencedOwned: async (olderThan, limit, client: DbClient = db) => {
    const rows = await client.mediaObject.findMany({
      where: {
        status: "ready",
        // Every object is owned since WI-7 made uploader_id NOT NULL — no owner
        // filter needed. Selection is: ready, unreferenced, settled past grace.
        createdAt: { lt: olderThan },
        references: { none: {} },
        quarantines: { none: { resolvedAt: null } },
      },
      select: CANDIDATE_SELECT,
      orderBy: { id: "asc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      storageKey: storageKey(row.storageKey),
      size: row.size,
      reason: "unreferenced" as const,
    }));
  },

  keysWithRow: async (keys, client: DbClient = db) => {
    if (keys.length === 0) return new Set<string>();
    const rows = await client.mediaObject.findMany({
      where: { storageKey: { in: keys } },
      select: { storageKey: true },
    });
    return new Set(rows.map((row) => row.storageKey));
  },

  findLingeringTombstones: async (keys, client: DbClient = db) => {
    if (keys.length === 0) return [];
    const rows = await client.mediaObject.findMany({
      where: { status: "deleted", storageKey: { in: keys } },
      select: CANDIDATE_SELECT,
      orderBy: { id: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      storageKey: storageKey(row.storageKey),
      size: row.size,
    }));
  },

  tombstoneIfReclaimable: async (id, client: DbClient) => {
    // Lock the row FOR UPDATE. This conflicts with the attach path's own
    // FOR UPDATE (media.ownership), so an attach that raced this reclaim either
    // already committed its reference (caught by the re-count below) or blocks
    // until this commits and then sees the tombstone and refuses (M11 Step 0).
    const locked = await client.$queryRawUnsafe<{ status: string }[]>(
      `SELECT status FROM media_objects WHERE id = $1 FOR UPDATE`,
      id,
    );
    if (locked.length === 0 || locked[0]!.status !== "ready") return false;

    // Re-check referenced-ness UNDER the lock — the TOCTOU guard the grace window
    // alone cannot give. A reference that began since selection makes this > 0.
    const refs = await client.mediaReference.count({ where: { mediaId: id } });
    if (refs > 0) return false;

    const { count } = await client.mediaObject.updateMany({
      where: { id, status: "ready" },
      data: { status: "deleted" },
    });
    return count === 1;
  },

  recordAudit: async (rows, client: DbClient = db) => {
    if (rows.length === 0) return;
    await client.mediaReclamationAudit.createMany({ data: rows });
  },

  openQuarantine: async (entries, client: DbClient = db) => {
    if (entries.length === 0) return;
    const mediaIds = entries.map((e) => e.mediaId).filter((x): x is number => x !== null);
    const keys = entries.map((e) => e.storageKey).filter((x): x is string => x !== null);
    // Which targets already have an OPEN row — so re-detecting a divergence does
    // not pile up duplicate review entries each pass.
    const open = await client.mediaQuarantine.findMany({
      where: { resolvedAt: null, OR: [{ mediaId: { in: mediaIds } }, { storageKey: { in: keys } }] },
      select: { mediaId: true, storageKey: true },
    });
    const openIds = new Set(open.map((o) => o.mediaId).filter((x): x is number => x !== null));
    const openKeys = new Set(open.map((o) => o.storageKey).filter((x): x is string => x !== null));
    const fresh = entries.filter(
      (e) =>
        !(e.mediaId !== null && openIds.has(e.mediaId)) &&
        !(e.storageKey !== null && openKeys.has(e.storageKey)),
    );
    if (fresh.length === 0) return;
    await client.mediaQuarantine.createMany({
      data: fresh.map((e) => ({
        mediaId: e.mediaId,
        storageKey: e.storageKey,
        kind: e.kind,
        detail: e.detail,
        detectedAt: e.detectedAt,
      })),
    });
  },
});
