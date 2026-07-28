/**
 * Media module — ingest orchestration (ADR 0005 Decision 5, as amended by ADR 0008).
 *
 * Transport-agnostic: takes a byte `Readable` plus authorization evidence, never
 * an HTTP request. Owns the streaming mechanics the validation component (M3)
 * deliberately does not: reading the declared head, counting bytes, aborting
 * once the count exceeds the limit, and cleaning up a partial object on any
 * failure. Write-after-validate: the registry row is created only after the
 * bytes are fully stored and verified — no pending state.
 *
 * Authorization: an authenticated principal is the single ingest evidence type
 * (the pre-auth upload grant was retired — ADR 0008); the uploader is the
 * object's provenance.
 */

import { randomBytes } from "node:crypto";
import { Transform, type Readable, type TransformCallback } from "node:stream";

import {
  MediaIngestError,
  MediaReadError,
  MediaStorageError,
  MediaValidationError,
} from "./media.errors.js";
import { storageKey } from "./media.keys.js";
import { createMediaRepository } from "./media.repository.js";
import {
  MEDIA_MAX_SIZE_BYTES,
  MEDIA_SIGNATURE_HEAD_LENGTH,
  detectMediaType,
  verifyMediaContent,
} from "./media.validation.js";
import { createStorageAdapter } from "./storage/index.js";
import type {
  IMediaRepository,
  MediaProvenance,
  MediaToken,
  StorageAdapter,
} from "./media.types.js";

// ─── Public contract — the ingest/read boundary ──────────────────────────────

/** Ingest authorization evidence — an authenticated user only (ADR 0008: the
 * pre-auth grant evidence type was retired). */
export type IngestEvidence = { kind: "user"; userId: number };

/** What ingest returns to the client — the reference token plus display facts. */
export interface IngestResult {
  token: MediaToken;
  contentType: string;
  size: number;
}

/**
 * A servable object opened for reading: the header facts plus the byte stream.
 * Deliberately narrow — it carries no storage detail (the storage key stays
 * inside the module; the read boundary only needs the type, size, and bytes).
 */
export interface MediaReadResult {
  contentType: string;
  size: number;
  stream: Readable;
}

/** Media's orchestration contract — transport-agnostic (a `Readable`, never HTTP). */
export interface IMediaService {
  ingest(file: Readable, evidence: IngestEvidence): Promise<IngestResult>;
  /** Resolve a public token to a servable object; the access-control seam (ADR 0005 D4). */
  read(token: MediaToken): Promise<MediaReadResult>;
}

// ─── Stream inspection (the ingest-side mechanics of the M3 policy) ──────────

/**
 * Pass-through that captures the signature head, counts bytes, and fails fast:
 * aborts the stream once the count exceeds the size limit, or as soon as the
 * completed head does not verify as an allowed type. The authoritative final
 * verification still runs after the stream ends.
 */
class ContentInspector extends Transform {
  private headChunks: Buffer[] = [];
  private headLength = 0;
  private total = 0;
  private headChecked = false;

  head(): Uint8Array {
    return Buffer.concat(this.headChunks).subarray(0, MEDIA_SIGNATURE_HEAD_LENGTH);
  }

  size(): number {
    return this.total;
  }

  override _transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback): void {
    this.total += chunk.length;
    if (this.total > MEDIA_MAX_SIZE_BYTES) {
      cb(MediaValidationError.tooLarge(this.total, MEDIA_MAX_SIZE_BYTES));
      return;
    }
    if (this.headLength < MEDIA_SIGNATURE_HEAD_LENGTH) {
      this.headChunks.push(chunk);
      this.headLength += chunk.length;
      if (!this.headChecked && this.headLength >= MEDIA_SIGNATURE_HEAD_LENGTH) {
        this.headChecked = true;
        if (detectMediaType(this.head()) === null) {
          cb(MediaValidationError.unsupportedType());
          return;
        }
      }
    }
    cb(null, chunk);
  }
}

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IMediaService with injected dependencies.
 *
 * @param storage - Byte-I/O backend (defaults to the configured adapter)
 * @param repo - Registry data access (defaults to the Prisma-backed repository)
 */
export const createMediaService = (
  storage: StorageAdapter = createStorageAdapter(),
  repo: IMediaRepository = createMediaRepository(),
): IMediaService => {
  return {
    ingest: async (file, evidence) => {
      // The authenticated uploader is the object's provenance — the single model
      // after the pre-auth grant was retired (ADR 0008).
      const provenance: MediaProvenance = { uploaderId: evidence.userId };

      const key = storageKey(`objects/${randomBytes(16).toString("base64url")}`);
      const inspector = new ContentInspector();
      // A source-stream failure (client abort / truncated upload) is a bad
      // request, not a server error — wrap it so the boundary maps it to 4xx.
      file.on("error", () => inspector.destroy(MediaIngestError.sourceFailed()));

      const source = file.pipe(inspector);
      // The inspector can reject *fast* — a small non-image, or an over-limit
      // head — before `storage.save` attaches its reader across the unavoidable
      // async gap (directory creation). Without a listener here that `'error'`
      // is unhandled, which crashes the whole process, not just the request.
      // Capture it synchronously so it becomes an ordinary request failure; the
      // storage read still rejects too, and the catch prefers this typed cause
      // over the generic stream-teardown error it surfaces.
      let inspectError: unknown = null;
      source.on("error", (err: unknown) => {
        inspectError ??= err;
      });

      try {
        await storage.save(key, source);
        // Authoritative check on the completed content (covers heads shorter
        // than the fail-fast threshold and pins the verified stored type).
        const contentType = verifyMediaContent(inspector.head(), inspector.size());
        const object = await repo.create({
          storageKey: key,
          contentType,
          size: inspector.size(),
          provenance,
        });
        return {
          token: object.token,
          contentType: object.contentType,
          size: object.size,
        };
      } catch (err) {
        // Partial-object cleanup: nothing is servable unless fully validated
        // and registered (delete is idempotent; a cleanup failure must not
        // mask the original error — reclamation covers stragglers).
        await storage.delete(key).catch(() => undefined);
        // Prefer the inspector's typed rejection (validation/size/source) over
        // the generic teardown error `save` raises once its source is dead.
        throw inspectError ?? err;
      }
    },

    read: async (token) => {
      const object = await repo.findByToken(token);
      if (object === null) throw MediaReadError.notFound();

      if (object.status === "ready") {
        try {
          const stream = await storage.createReadStream(object.storageKey);
          return { contentType: object.contentType, size: object.size, stream };
        } catch (err) {
          // Registry↔storage divergence: a ready row whose bytes are absent.
          // Fail safe for the client, but keep it observable; reconciliation
          // (quarantine, physical cleanup) belongs to the reclamation Work Item,
          // and is deliberately not done here.
          if (err instanceof MediaStorageError && err.code === "not_found") {
            console.error(
              "[Media] registry/storage divergence: a ready object has no stored bytes",
              { token, storageKey: object.storageKey },
            );
            throw MediaReadError.notFound();
          }
          throw err;
        }
      }

      if (object.status === "deleted") throw MediaReadError.gone();
      // pending (not-yet-servable), or any unexpected status → not served.
      throw MediaReadError.notFound();
    },
  };
};
