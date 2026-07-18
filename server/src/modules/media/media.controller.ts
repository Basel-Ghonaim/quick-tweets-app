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

import { AppError } from "../../shared/errors/index.js";
import { sendSuccess } from "../../shared/response/index.js";
import {
  MediaGrantError,
  MediaIngestError,
  MediaValidationError,
} from "./media.errors.js";
import { mintUploadGrant } from "./media.grants.js";
import { createMediaService } from "./media.service.js";
import { MEDIA_MAX_SIZE_BYTES } from "./media.validation.js";
import type { IMediaService, IngestEvidence } from "./media.types.js";

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
  return err;
};

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
});
