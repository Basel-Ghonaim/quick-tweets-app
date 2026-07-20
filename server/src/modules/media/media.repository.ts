/**
 * Media module — the MediaObject registry repository.
 *
 * Media's private authority for storage detail + identity (ADR 0005 Decision 3):
 * it persists a stored object's storage key, verified content type, size, status,
 * provenance (uploader or grant — ADR 0007), and its opaque token, and resolves
 * a token back to that record. Factory-DI in the project idiom; **internal** to
 * the module — never exported from `index.ts`, since features consume Media only
 * through its published interface (Decision 2).
 *
 * Content is immutable-once-ready: no path rewrites a stored object's bytes,
 * type, size, or token. The one admissible mutation is adoption's one-time
 * *ownership* fill (`adoptById`, M6 / ADR 0007) — a conditional write that turns
 * grant provenance into an owner. Physical deletion and status transitions still
 * belong to later Work Items (M11).
 *
 * Principle: SRP — only database queries, no business logic.
 * Principle: Factory Pattern — createMediaRepository(db?) enables mock injection.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import { storageKey } from "./media.keys.js";
import { mediaToken, mintToken } from "./media.tokens.js";
import type {
  IMediaRepository,
  MediaObject,
  MediaStatus,
} from "./media.types.js";

type PrismaInstance = typeof prisma;

/** A persisted registry row, before it is mapped to the branded domain `MediaObject`. */
interface MediaObjectRow {
  id: number;
  token: string;
  storageKey: string;
  contentType: string;
  size: number;
  status: string;
  uploaderId: number | null;
  grantId: string | null;
  grantExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Map a raw row to the branded domain object, re-validating the identifiers on read. */
const toMediaObject = (row: MediaObjectRow): MediaObject => ({
  id: row.id,
  token: mediaToken(row.token),
  storageKey: storageKey(row.storageKey),
  contentType: row.contentType,
  size: row.size,
  status: row.status as MediaStatus,
  uploaderId: row.uploaderId,
  grantId: row.grantId,
  grantExpiresAt: row.grantExpiresAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// ─── Repository ──────────────────────────────────────────────────────────────

/**
 * Creates an IMediaRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to the singleton, injectable for tests)
 */
export const createMediaRepository = (
  db: PrismaInstance = prisma,
): IMediaRepository => ({
  create: async (input) => {
    const row = await db.mediaObject.create({
      data: {
        token: mintToken(),
        storageKey: input.storageKey,
        contentType: input.contentType,
        size: input.size,
        ...("uploaderId" in input.provenance
          ? { uploaderId: input.provenance.uploaderId }
          : {
              grantId: input.provenance.grantId,
              grantExpiresAt: input.provenance.grantExpiresAt,
            }),
      },
    });
    return toMediaObject(row);
  },

  findByToken: async (token, client: DbClient = db) => {
    const row = await client.mediaObject.findUnique({ where: { token } });
    return row === null ? null : toMediaObject(row);
  },

  countByGrant: (grantId) => db.mediaObject.count({ where: { grantId } }),

  adoptById: async (referenceId, ownerId, expectedGrantId, client: DbClient = db) => {
    // Conditional atomic adopt: fill `uploaderId` only while still null AND the
    // recorded grant matches. `updateMany` reports how many rows matched — a
    // replay or a concurrent second adoption matches zero (the guard for
    // "a grant is spent by adoption, exactly once"; ADR 0007).
    const { count } = await client.mediaObject.updateMany({
      where: { id: referenceId, uploaderId: null, grantId: expectedGrantId },
      data: { uploaderId: ownerId },
    });
    return count === 1;
  },

  findTokenById: async (referenceId, client: DbClient = db) => {
    const row = await client.mediaObject.findUnique({
      where: { id: referenceId },
      select: { token: true },
    });
    return row === null ? null : mediaToken(row.token);
  },

  usageFor: async (ownerId, client: DbClient = db) => {
    // Owned + servable only: tombstones don't count, and ownerless
    // grant-provenance objects belong to no principal (they are M11's concern).
    const { _count, _sum } = await client.mediaObject.aggregate({
      where: { uploaderId: ownerId, status: "ready" },
      _count: { _all: true },
      _sum: { size: true },
    });
    return { objectCount: _count._all, totalBytes: _sum.size ?? 0 };
  },
});
