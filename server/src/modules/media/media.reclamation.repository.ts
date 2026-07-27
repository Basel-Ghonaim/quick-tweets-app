/**
 * Media reclamation — the registry-only selection queries (M11).
 *
 * Reclamation finds two computed classes from **Media's own state** (ADR 0005
 * Decision 8; ADR 0007) and never reads a feature schema:
 *
 * - **Abandoned** — a grant-provenance object never adopted, whose grant is no
 *   longer live (`uploader_id IS NULL AND grant_expires_at < now`). The grant TTL
 *   *is* the opportunity window (ADR 0007 Decision 5), so no separate grace applies.
 * - **Unreferenced-owned** — an owned object (`uploader_id` set) with no ledger
 *   row that has been settled past the grace window (`created_at < now − grace`).
 *   The grace covers the upload→first-attach compose gap — the only window in
 *   which a live-to-be object legitimately has no reference yet.
 *
 * Both exclude non-servable rows (`status <> 'ready'`, i.e. tombstones) and
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

/** Why an object is a reclamation candidate — recorded on the audit trail (Step 5). */
export type ReclaimReason = "abandoned" | "unreferenced";

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

/** Reclamation's read surface over the registry — no feature schema, ever. */
export interface IReclamationRepository {
  /** Never-adopted grant objects whose grant has expired. Ascending id, capped at `limit`. */
  findAbandoned(now: Date, limit: number, client?: DbClient): Promise<ReclaimCandidate[]>;
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
   * Reclaim object `id` **within the caller's transaction**: lock it `FOR UPDATE`
   * (conflicting with the attach path's own `FOR UPDATE`, so the two serialize),
   * re-check under the lock that it is still `ready` **and** unreferenced, and if
   * so tombstone it (`status='deleted'`). Returns whether it tombstoned — `false`
   * means it lost the race (a reference began, or it was already reclaimed) and
   * must be left alone. The byte delete is the caller's, after commit (tombstone
   * before bytes). Registry-only; no feature schema.
   */
  tombstoneIfReclaimable(id: number, client: DbClient): Promise<boolean>;
}

const CANDIDATE_SELECT = { id: true, storageKey: true, size: true } as const;

export const createReclamationRepository = (
  db: PrismaInstance = prisma,
): IReclamationRepository => ({
  findAbandoned: async (now, limit, client: DbClient = db) => {
    const rows = await client.mediaObject.findMany({
      where: {
        status: "ready",
        uploaderId: null,
        grantExpiresAt: { lt: now },
        // `none` is Media's own ledger relation — belt-and-suspenders, since an
        // unadopted object was never attached; still, never assume.
        references: { none: {} },
      },
      select: CANDIDATE_SELECT,
      orderBy: { id: "asc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      storageKey: storageKey(row.storageKey),
      size: row.size,
      reason: "abandoned" as const,
    }));
  },

  findUnreferencedOwned: async (olderThan, limit, client: DbClient = db) => {
    const rows = await client.mediaObject.findMany({
      where: {
        status: "ready",
        uploaderId: { not: null },
        createdAt: { lt: olderThan },
        references: { none: {} },
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
});
