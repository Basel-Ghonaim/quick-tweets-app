/**
 * Media controller — HTTP/multipart boundary tests.
 *
 * Drives the controller through a REAL busboy parse of crafted multipart
 * bodies, with a stub service, so evidence resolution, the field contract,
 * and domain-error → HTTP-status mapping are all exercised.
 */

import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { MediaGrantError, MediaValidationError } from "./media.errors";
import { createMediaController } from "./media.controller";
import type { IMediaService, IngestEvidence, IngestResult } from "./media.types";

const BOUNDARY = "----vitestBoundary";

/** Build a multipart/form-data body from field descriptors. */
const multipart = (
  parts: { name: string; filename?: string; contentType?: string; data?: string | Buffer }[],
): Buffer => {
  const chunks: Buffer[] = [];
  for (const p of parts) {
    let header = `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${p.name}"`;
    if (p.filename) header += `; filename="${p.filename}"`;
    header += "\r\n";
    if (p.contentType) header += `Content-Type: ${p.contentType}\r\n`;
    header += "\r\n";
    chunks.push(Buffer.from(header), Buffer.isBuffer(p.data) ? p.data : Buffer.from(p.data ?? ""), Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`));
  return Buffer.concat(chunks);
};

interface RunOutcome {
  status?: number;
  body?: unknown;
  error?: unknown;
  evidence?: IngestEvidence;
}

/** Drive controller.ingest to completion and capture how it responded. */
const runIngest = (
  service: IMediaService,
  opts: { userId?: number; headers?: Record<string, string>; multipart?: boolean; body?: Buffer },
): Promise<RunOutcome> =>
  new Promise((resolve) => {
    const body = opts.body ?? multipart([{ name: "file", filename: "a.png", contentType: "image/png", data: "png" }]);
    const headers: Record<string, string> = {
      "content-type": opts.multipart === false ? "application/json" : `multipart/form-data; boundary=${BOUNDARY}`,
      ...opts.headers,
    };
    const req = Object.assign(Readable.from([body]), { headers, userId: opts.userId });
    const res = {
      destroyed: false,
      statusCode: 0,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { resolve({ status: this.statusCode, body: payload }); },
      send() { resolve({ status: this.statusCode }); },
    };
    const next = (error?: unknown) => resolve({ error });
    createMediaController(service).ingest(req as never, res as never, next);
  });

const okService = (capture?: (e: IngestEvidence) => void): IMediaService => ({
  ingest: async (file, evidence): Promise<IngestResult> => {
    capture?.(evidence);
    for await (const _ of file) { /* drain */ }
    return { token: "TOKEN123abc" as never, contentType: "image/png", size: 3 };
  },
});

const throwingService = (err: unknown): IMediaService => ({
  ingest: async (file) => {
    for await (const _ of file) { /* drain */ }
    throw err;
  },
});

describe("media controller — ingest", () => {
  it("ingests under an authenticated principal and returns 201", async () => {
    let evidence: IngestEvidence | undefined;
    const out = await runIngest(okService((e) => (evidence = e)), { userId: 42 });
    expect(out.status).toBe(201);
    expect(evidence).toEqual({ kind: "user", userId: 42 });
    expect(out.body).toMatchObject({ success: true, data: { contentType: "image/png" } });
  });

  it("ingests under an X-Upload-Grant header when unauthenticated", async () => {
    let evidence: IngestEvidence | undefined;
    await runIngest(okService((e) => (evidence = e)), {
      headers: { "x-upload-grant": "grant-abc" },
    });
    expect(evidence).toEqual({ kind: "grant", grant: "grant-abc" });
  });

  it("prefers the Bearer principal when both evidences are present", async () => {
    let evidence: IngestEvidence | undefined;
    await runIngest(okService((e) => (evidence = e)), {
      userId: 7,
      headers: { "x-upload-grant": "ignored" },
    });
    expect(evidence).toEqual({ kind: "user", userId: 7 });
  });

  it("rejects a request with no evidence (401) without invoking the service", async () => {
    let called = false;
    const out = await runIngest({ ingest: async () => { called = true; throw new Error(); } }, {});
    expect(out.error).toBeInstanceOf(AppError);
    expect((out.error as AppError).statusCode).toBe(401);
    expect(called).toBe(false);
  });

  it("rejects a multipart body with no 'file' field (400)", async () => {
    const out = await runIngest(okService(), {
      userId: 1,
      body: multipart([{ name: "notfile", data: "x" }]),
    });
    expect((out.error as AppError).statusCode).toBe(400);
  });

  it("rejects a non-multipart request (400)", async () => {
    const out = await runIngest(okService(), { userId: 1, multipart: false, body: Buffer.from("{}") });
    expect((out.error as AppError).statusCode).toBe(400);
  });

  it("maps a validation rejection to 413 / 415", async () => {
    const tooLarge = await runIngest(throwingService(MediaValidationError.tooLarge(9, 5)), { userId: 1 });
    expect((tooLarge.error as AppError).statusCode).toBe(413);

    const badType = await runIngest(throwingService(MediaValidationError.unsupportedType()), { userId: 1 });
    expect((badType.error as AppError).statusCode).toBe(415);
  });

  it("maps an exhausted grant to 403 and an invalid grant to 401", async () => {
    const exhausted = await runIngest(throwingService(MediaGrantError.exhausted()), {
      headers: { "x-upload-grant": "g" },
    });
    expect((exhausted.error as AppError).statusCode).toBe(403);

    const invalid = await runIngest(throwingService(MediaGrantError.invalid()), {
      headers: { "x-upload-grant": "g" },
    });
    expect((invalid.error as AppError).statusCode).toBe(401);
  });
});
