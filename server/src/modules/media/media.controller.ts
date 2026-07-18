/**
 * Media controller — HTTP for the ingest boundary (the only transport-aware
 * Media layer).
 *
 * Purpose:
 * - mintGrant(): issue an upload grant (ADR 0007) for pre-auth flows
 * - ingest(): parse the multipart request (busboy, streaming — no whole-file
 *   buffering), resolve the authorization evidence (authenticated principal or
 *   `X-Upload-Grant` header), hand the file stream to the service, and map the
 *   module's domain errors to the reserved HTTP statuses (415/413/403/401/400)
 *
 * The 16 kB JSON body cap does not apply here: multipart bypasses
 * `express.json`, and the upload's own limit is enforced mid-stream by the
 * service (and belt-and-suspenders by busboy's `fileSize` transport cap).
 *
 * Principle: SRP — HTTP parsing and mapping only; the service owns orchestration.
 */

import busboy from "busboy";
import type { Request, Response, NextFunction } from "express";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { AppError } from "../../shared/errors/index.js";
import { sendSuccess } from "../../shared/response/index.js";
import {
  MediaGrantError,
  MediaIngestError,
  MediaReadError,
  MediaValidationError,
} from "./media.errors.js";
import { mintUploadGrant } from "./media.grants.js";
import { createMediaService } from "./media.service.js";
import { mediaToken } from "./media.tokens.js";
import { MEDIA_MAX_SIZE_BYTES } from "./media.validation.js";
import type { IMediaService, IngestEvidence, MediaToken } from "./media.types.js";

/** Map Media domain errors to the app's typed HTTP errors (reserved statuses). */
const toHttpError = (err: unknown): unknown => {
  if (err instanceof MediaValidationError) {
    return err.code === "too_large"
      ? AppError.payloadTooLarge("File exceeds the media size limit")
      : AppError.unsupportedMediaType("File content is not an allowed image type");
  }
  if (err instanceof MediaGrantError) {
    return err.code === "grant_exhausted"
      ? AppError.forbidden("Upload grant is exhausted")
      : AppError.unauthorized("Invalid or expired upload grant");
  }
  if (err instanceof MediaIngestError) {
    return AppError.badRequest("Upload stream ended before completing");
  }
  if (err instanceof MediaReadError) {
    return err.code === "gone"
      ? AppError.gone("This media has been deleted")
      : AppError.notFound("Media");
  }
  return err;
};

/** A client that aborted mid-response — routine, not a failure worth logging. */
const isPrematureClose = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code?: unknown }).code === "ERR_STREAM_PREMATURE_CLOSE";

// ─── Controller Factory ──────────────────────────────────────────────────────

export const createMediaController = (
  service: IMediaService = createMediaService(),
) => ({
  // ── POST /media/grants ──

  mintGrant: (_req: Request, res: Response): void => {
    const { grant, expiresAt } = mintUploadGrant();
    sendSuccess(res, { grant, expiresAt }, 201);
  },

  // ── POST /media (multipart, field "file") ──

  ingest: (req: Request, res: Response, next: NextFunction): void => {
    // Resolve authorization evidence first — no evidence, no parsing.
    let evidence: IngestEvidence;
    if (req.userId !== undefined) {
      evidence = { kind: "user", userId: req.userId };
    } else {
      const grantHeader = req.headers["x-upload-grant"];
      if (typeof grantHeader !== "string" || grantHeader.length === 0) {
        next(AppError.unauthorized("Authentication or an upload grant is required"));
        return;
      }
      evidence = { kind: "grant", grant: grantHeader };
    }

    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({
        headers: req.headers,
        limits: {
          files: 1,
          // One byte above the policy limit so the service's inclusive
          // at-limit semantics decide the boundary byte, while a runaway
          // stream is still cut at the transport.
          fileSize: MEDIA_MAX_SIZE_BYTES + 1,
          // Bound non-file multipart content against a memory/CPU DoS.
          fields: 2,
          fieldSize: 1024,
          parts: 4,
        },
      });
    } catch {
      next(AppError.badRequest("Expected a multipart/form-data request"));
      return;
    }

    let fileHandled = false;
    let finished = false;
    let currentFile: Readable | null = null;

    // Respond at most once, and never to an already-torn-down connection.
    const finish = (action: () => void): void => {
      if (finished) return;
      finished = true;
      if (!res.destroyed) action();
    };

    parser.on("file", (field, file) => {
      if (fileHandled || field !== "file") {
        file.resume(); // drain unclaimed streams so parsing completes
        return;
      }
      fileHandled = true;
      currentFile = file;
      service
        .ingest(file, evidence)
        .then((result) => finish(() => sendSuccess(res, result, 201)))
        .catch((err: unknown) => finish(() => next(toHttpError(err))));
    });

    parser.on("close", () => {
      if (!fileHandled) {
        finish(() => next(AppError.badRequest("A multipart field named 'file' is required")));
      }
    });

    parser.on("error", () => {
      finish(() => next(AppError.badRequest("Malformed multipart request")));
    });

    // Client abort / premature close: destroy the in-flight upload stream so
    // the service's error path runs (partial-object cleanup, promise settles)
    // rather than leaking a write handle and hanging forever.
    req.on("close", () => {
      if (!req.readableEnded) {
        currentFile?.destroy(new Error("request aborted"));
        parser.destroy();
      }
    });

    req.pipe(parser);
  },

  // ── GET /media/:token (public read) ──

  read: (req: Request, res: Response, next: NextFunction): void => {
    const rawToken = req.params.token;
    let token: MediaToken;
    try {
      token = mediaToken(typeof rawToken === "string" ? rawToken : "");
    } catch {
      next(AppError.notFound("Media")); // malformed token → uniform 404 (no info leak)
      return;
    }
    service
      .read(token)
      .then(({ contentType, size, stream }) => {
        // Security envelope (ADR 0005 D7): serve the content-derived type,
        // non-sniffable, so the endpoint never serves active content from the
        // app origin. Cache-Control is bounded (not `immutable`) so a future
        // deletion propagates out of caches within the window.
        res.setHeader("Content-Type", contentType);
        res.setHeader("X-Content-Type-Options", "nosniff");
        // This object is public-by-token and the top-level mount exists to be
        // embeddable (e.g. `<img src>`). Override helmet's global `same-origin`
        // default for THIS response only, so cross-origin embedding works. CORP
        // is not an authorization mechanism here — a direct GET already bypasses
        // it; media access posture remains the deferred, seam-owned decision.
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Content-Length", String(size));
        res.setHeader("Cache-Control", "public, max-age=3600");
        // `pipeline` (not a bare `pipe`) so the source byte stream is destroyed —
        // and its file descriptor closed — when the client aborts mid-download:
        // `pipe` would only unpipe it, leaking the fd on this public, high-volume
        // endpoint. A client abort settles as ERR_STREAM_PREMATURE_CLOSE (routine,
        // not logged); any other post-header failure — a mid-read I/O fault, or a
        // registry↔storage divergence that escaped the pre-stream check — is logged
        // so it stays observable, then the connection resets (the headers are
        // already sent, so the status can no longer change).
        pipeline(stream, res).catch((err: unknown) => {
          if (!isPrematureClose(err)) {
            console.error(
              "[Media] read stream failed after response headers were sent",
              { token, err },
            );
          }
        });
      })
      .catch((err: unknown) => next(toHttpError(err)));
  },
});
