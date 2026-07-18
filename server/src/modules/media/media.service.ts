/**
 * Media module — ingest orchestration (ADR 0005 Decision 5, under ADR 0007).
 *
 * Transport-agnostic: takes a byte `Readable` plus authorization evidence, never
 * an HTTP request. Owns the streaming mechanics the validation component (M3)
 * deliberately does not: reading the declared head, counting bytes, aborting
 * once the count exceeds the limit, and cleaning up a partial object on any
 * failure. Write-after-validate: the registry row is created only after the
 * bytes are fully stored and verified — no pending state.
 *
 * Evidence resolution (ADR 0007): an authenticated principal, or a verified
 * upload grant whose per-grant object bound is enforced against the registry.
 */

import { randomBytes } from "node:crypto";
import { Transform, type TransformCallback } from "node:stream";

import { isPrismaError } from "../../shared/utils/index.js";
import {
  MediaGrantError,
  MediaIngestError,
  MediaReadError,
  MediaStorageError,
  MediaValidationError,
} from "./media.errors.js";
import { GRANT_MAX_OBJECTS, verifyUploadGrant } from "./media.grants.js";
import { storageKey } from "./media.keys.js";
import { createMediaRepository } from "./media.repository.js";
import {
  MEDIA_MAX_SIZE_BYTES,
  MEDIA_SIGNATURE_HEAD_LENGTH,
  detectMediaType,
  verifyMediaContent,
} from "./media.validation.js";
import { createStorageAdapter } from "./index.js";
import type {
  IMediaRepository,
  IMediaService,
  IngestEvidence,
  MediaProvenance,
  StorageAdapter,
} from "./media.types.js";

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
  /** Verify evidence and produce the provenance the registry records. */
  const resolveProvenance = async (
    evidence: IngestEvidence,
  ): Promise<MediaProvenance> => {
    if (evidence.kind === "user") {
      return { uploaderId: evidence.userId };
    }
    const grant = verifyUploadGrant(evidence.grant);
    const used = await repo.countByGrant(grant.id);
    if (used >= GRANT_MAX_OBJECTS) {
      throw MediaGrantError.exhausted();
    }
    return { grantId: grant.id, grantExpiresAt: grant.expiresAt };
  };

  return {
    ingest: async (file, evidence) => {
      // Authorize before any byte is stored.
      const provenance = await resolveProvenance(evidence);

      const key = storageKey(`objects/${randomBytes(16).toString("base64url")}`);
      const inspector = new ContentInspector();
      // A source-stream failure (client abort / truncated upload) is a bad
      // request, not a server error — wrap it so the boundary maps it to 4xx.
      file.on("error", () => inspector.destroy(MediaIngestError.sourceFailed()));

      try {
        await storage.save(key, file.pipe(inspector));
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
        // The per-grant unique constraint is the atomic backstop for the
        // count bound under concurrency (the pre-check races); a violation
        // means the grant already spent its allowance.
        if (isPrismaError(err, "P2002")) {
          throw MediaGrantError.exhausted();
        }
        throw err;
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
