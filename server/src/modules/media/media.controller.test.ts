/**
 * Media controller — HTTP/multipart boundary tests.
 *
 * Drives the controller through a REAL busboy parse of crafted multipart
 * bodies, with a stub service, so evidence resolution, the field contract,
 * and domain-error → HTTP-status mapping are all exercised.
 */

import { Readable, Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { MediaGrantError, MediaReadError, MediaValidationError } from "./media.errors";
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

const unusedRead: IMediaService["read"] = async () => {
  throw new Error("read not used in this test");
};

const okService = (capture?: (e: IngestEvidence) => void): IMediaService => ({
  ingest: async (file, evidence): Promise<IngestResult> => {
    capture?.(evidence);
    for await (const _ of file) { /* drain */ }
    return { token: "TOKEN123abc" as never, contentType: "image/png", size: 3 };
  },
  read: unusedRead,
});

const throwingService = (err: unknown): IMediaService => ({
  ingest: async (file) => {
    for await (const _ of file) { /* drain */ }
    throw err;
  },
  read: unusedRead,
});

const readOnly = (read: IMediaService["read"]): IMediaService => ({
  ingest: async () => { throw new Error("ingest not used in this test"); },
  read,
});

/** A minimal writable response that records headers and collects the piped body. */
class MockReadRes extends Writable {
  headers: Record<string, string> = {};
  private chunks: Buffer[] = [];
  setHeader(key: string, value: string): void { this.headers[key] = value; }
  override _write(chunk: Buffer, _enc: BufferEncoding, cb: (e?: Error | null) => void): void {
    this.chunks.push(Buffer.from(chunk));
    cb();
  }
  body(): Buffer { return Buffer.concat(this.chunks); }
}

interface ReadOutcome {
  status?: number;
  headers?: Record<string, string>;
  body?: Buffer;
  error?: unknown;
}

const runRead = (service: IMediaService, token: string): Promise<ReadOutcome> =>
  new Promise((resolve) => {
    const req = { params: { token } };
    const res = new MockReadRes();
    res.on("finish", () => resolve({ status: 200, headers: res.headers, body: res.body() }));
    const next = (error?: unknown) => resolve({ error });
    createMediaController(service).read(req as never, res as never, next);
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
    const out = await runIngest({ ingest: async () => { called = true; throw new Error(); }, read: unusedRead }, {});
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

describe("media controller — read", () => {
  const VALID_TOKEN = "Nk3v9qYw1kPz-XG27RODaQ"; // 22-char base64url, passes mediaToken()

  it("streams a ready object with the full security envelope", async () => {
    const svc = readOnly(async () => ({
      contentType: "image/png",
      size: 5,
      stream: Readable.from([Buffer.from("hello")]),
    }));
    const out = await runRead(svc, VALID_TOKEN);

    expect(out.status).toBe(200);
    expect(out.headers?.["Content-Type"]).toBe("image/png"); // content-derived
    expect(out.headers?.["X-Content-Type-Options"]).toBe("nosniff");
    // Route-scoped override of helmet's global `same-origin` so the public,
    // embeddable asset can be loaded cross-origin (e.g. in `<img src>`).
    expect(out.headers?.["Cross-Origin-Resource-Policy"]).toBe("cross-origin");
    expect(out.headers?.["Content-Disposition"]).toBe("inline");
    expect(out.headers?.["Content-Length"]).toBe("5");
    expect(out.headers?.["Cache-Control"]).toBe("public, max-age=3600");
    expect(out.body?.toString()).toBe("hello");
    // storage detail never leaks into the response headers.
    expect(JSON.stringify(out.headers)).not.toMatch(/storage|objects\//i);
  });

  it("returns 410 Gone for a deleted object", async () => {
    const out = await runRead(readOnly(async () => { throw MediaReadError.gone(); }), VALID_TOKEN);
    expect((out.error as AppError).statusCode).toBe(410);
  });

  it("returns 404 for a not-available object (unknown / pending / divergence)", async () => {
    const out = await runRead(readOnly(async () => { throw MediaReadError.notFound(); }), VALID_TOKEN);
    expect((out.error as AppError).statusCode).toBe(404);
  });

  it("returns 404 for a malformed token without invoking the service", async () => {
    let called = false;
    const out = await runRead(readOnly(async () => { called = true; throw new Error(); }), "has/slash");
    expect((out.error as AppError).statusCode).toBe(404);
    expect(called).toBe(false);
  });

  it("destroys the source byte stream when the client aborts mid-download (no fd leak)", async () => {
    const source = new Readable({ read() { /* never ends on its own */ } });
    const svc = readOnly(async () => ({ contentType: "image/png", size: 100, stream: source }));
    const res = new MockReadRes();
    const sourceClosed = new Promise<void>((resolve) => source.once("close", () => resolve()));

    createMediaController(svc).read({ params: { token: VALID_TOKEN } } as never, res as never, () => {});
    // Let service.read()'s continuation attach the pipeline, then simulate the
    // client disconnecting mid-transfer.
    await new Promise((r) => setImmediate(r));
    res.destroy();

    // pipeline must tear the source down; a bare pipe would leave it open and
    // this await would hang until the test times out.
    await sourceClosed;
    expect(source.destroyed).toBe(true);
  });

  it("logs a post-header stream failure so I/O faults / divergence stay observable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const source = new Readable({ read() { this.destroy(new Error("mid-read I/O fault")); } });
    const svc = readOnly(async () => ({ contentType: "image/png", size: 100, stream: source }));
    const res = new MockReadRes();
    const resClosed = new Promise<void>((resolve) => res.once("close", () => resolve()));

    createMediaController(svc).read({ params: { token: VALID_TOKEN } } as never, res as never, () => {});
    await resClosed; // the source error propagates through pipeline and destroys res
    await new Promise((r) => setImmediate(r)); // let pipeline's rejection handler run

    expect(spy).toHaveBeenCalled(); // a genuine failure is logged (client aborts are not)
    spy.mockRestore();
  });
});
