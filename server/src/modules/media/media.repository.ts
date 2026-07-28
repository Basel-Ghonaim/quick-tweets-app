/**
 * Media module — the MediaObject registry repository.
 *
 * Media's private authority for storage detail + identity (ADR 0005 Decision 3):
 * it persists a stored object's storage key, verified content type, size, status,
 * uploader provenance (ADR 0008: the single ownership model), and its opaque
 * token, and resolves a token back to that record. Factory-DI in the project
 * idiom; **internal** to the module — never exported from `index.ts`, since
 * features consume Media only through its published interface (Decision 2).
 *
 * Content is immutable-once-ready: no path rewrites a stored object's bytes, type,
 * size, or token, and ownership is set once, at ingest, from the authenticated
 * uploader. Physical deletion and status transitions belong to reclamation (M11).
 *
 * Principle: SRP — only database queries, no business logic.
 * Principle: Factory Pattern — createMediaRepository(db?) enables mock injection.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import { storageKey } from "./media.keys.js";
import { mediaToken, mintToken } from "./media.tokens.js";
import type {
  IMediaRepository,
  LockedMediaObject,
  MediaObject,
  MediaStatus,
} from "./media.types.js";

type PrismaInstance = typeof prisma;

/** The registry-row fields this repository maps (a subset of the Prisma row). */
interface MediaObjectRow {
  id: number;
  token: string;
  storageKey: string;
  contentType: string;
  size: number;
  status: string;
  uploaderId: number;
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
        uploaderId: input.provenance.uploaderId,
      },
    });
    return toMediaObject(row);
  },

  findByToken: async (token, client: DbClient = db) => {
    const row = await client.mediaObject.findUnique({ where: { token } });
    return row === null ? null : toMediaObject(row);
  },

  findTokensByIds: async (referenceIds, client: DbClient = db) => {
    if (referenceIds.length === 0) return new Map();
    const rows = await client.mediaObject.findMany({
      where: { id: { in: referenceIds }, status: "ready" },
      select: { id: true, token: true },
    });
    return new Map(rows.map((row) => [row.id, mediaToken(row.token)]));
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

  addReference: async ({ mediaId, referrer }, client: DbClient = db) => {
    // Idempotent by construction: the (media_id, referrer) uniqueness makes a
    // retried signal a no-op rather than a duplicate row.
    await client.mediaReference.upsert({
      where: { mediaId_referrer: { mediaId, referrer } },
      create: { mediaId, referrer },
      update: {},
    });
  },

  removeReference: async ({ mediaId, referrer }, client: DbClient = db) => {
    // deleteMany, not delete: an absent row is a no-op, so an end signal is
    // safe to replay and never throws on a reference that is already gone.
    await client.mediaReference.deleteMany({ where: { mediaId, referrer } });
  },

  countReferences: (mediaId, client: DbClient = db) =>
    client.mediaReference.count({ where: { mediaId } }),

  lockAndFetchByTokens: async (tokens, client: DbClient = db): Promise<LockedMediaObject[]> => {
    if (tokens.length === 0) return [];
    // Prisma has no `FOR UPDATE` builder, so the lock is raw. Values are bound as
    // parameters ($1..$n) — only fixed text and numbered placeholders are built,
    // never interpolated data. `ORDER BY id` locks the rows in ascending-id order
    // (deadlock-free across concurrent multi-attaches); `FOR UPDATE` conflicts
    // with a reclaimer's `FOR UPDATE` on the same row, which is what serializes
    // an attach against a tombstone (M11).
    const placeholders = tokens.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await client.$queryRawUnsafe<
      {
        id: number;
        token: string;
        uploaderId: number;
        status: string;
        contentType: string;
        size: number;
      }[]
    >(
      `SELECT id, token, uploader_id AS "uploaderId", status,
              content_type AS "contentType", size
         FROM media_objects
        WHERE token IN (${placeholders})
        ORDER BY id
        FOR UPDATE`,
      ...tokens,
    );
    return rows.map((row) => ({
      id: row.id,
      token: mediaToken(row.token),
      uploaderId: row.uploaderId,
      status: row.status as MediaStatus,
      contentType: row.contentType,
      size: row.size,
    }));
  },
});
