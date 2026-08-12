/**
 * Media ingest service — orchestration tests (mock ports, real streams).
 *
 * The service is exercised with an in-memory StorageAdapter and repository so
 * every test drives real stream mechanics: head capture, mid-stream aborts,
 * partial-object cleanup, and provenance recording.
 */

import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, expect, it, vi } from "vitest";

import {
  MediaIngestError,
  MediaReadError,
  MediaStorageError,
  MediaValidationError,
} from "./media.errors";
import { createMediaService } from "./media.service";
import { storageKey } from "./media.keys";
import { mintToken } from "./media.tokens";
import { MEDIA_MAX_SIZE_BYTES } from "./media.validation";
import type {
  IMediaRepository,
  MediaObject,
  NewMediaObject,
  StorageAdapter,
} from "./media.types";

const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** In-memory storage adapter that records saves/deletes and consumes streams. */
const makeStorage = () => {
  const saved = new Map<string, number>();
  const deleted: string[] = [];
  const adapter: StorageAdapter = {
    save: async (key, data) => {
      let bytes = 0;
      for await (const chunk of data) bytes += (chunk as Buffer).length;
      saved.set(key, bytes);
    },
    createReadStream: async () => Readable.from([]),
    exists: async (key) => saved.has(key),
    delete: async (key) => {
      saved.delete(key);
      deleted.push(key);
    },
    enumerate: async () => [...saved.keys()] as never,
  };
  return { adapter, saved, deleted };
};

/** In-memory repository capturing creates. */
const makeRepo = () => {
  const creates: NewMediaObject[] = [];
  const repo: IMediaRepository = {
    create: async (input) => {
      creates.push(input);
      const obj: MediaObject = {
        id: creates.length,
        token: mintToken(),
        storageKey: input.storageKey,
        contentType: input.contentType,
        size: input.size,
        status: "ready",
        uploaderId: input.provenance.uploaderId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return obj;
    },
    findByToken: async () => null,
    findTokensByIds: async () => new Map(),
    usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
    addReference: async () => {},
    removeReference: async () => {},
    countReferences: async () => 0,
    lockAndFetchByTokens: async () => [],
  };
  return { repo, creates };
};

describe("media ingest service", () => {
  it("ingests a valid file under an authenticated principal", async () => {
    const { adapter, saved, deleted } = makeStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);

    const result = await service.ingest(Readable.from([PNG_HEAD, Buffer.alloc(100)]), {
      kind: "user",
      userId: 42,
    });

    expect(result.contentType).toBe("image/png");
    expect(result.size).toBe(PNG_HEAD.length + 100);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(creates).toHaveLength(1);
    expect(creates[0]!.provenance).toEqual({ uploaderId: 42 });
    expect(saved.size).toBe(1);
    expect(deleted).toHaveLength(0);
    // The storage key never leaves the module through the result.
    expect(Object.values(result)).not.toContain([...saved.keys()][0]);
  });

  it("aborts an oversized stream mid-flight and cleans up the partial object", async () => {
    const { adapter, saved, deleted } = makeStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);

    const oversize = Readable.from([
      PNG_HEAD,
      Buffer.alloc(MEDIA_MAX_SIZE_BYTES), // head + this exceeds the limit
    ]);
    const err = await service
      .ingest(oversize, { kind: "user", userId: 1 })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaValidationError);
    expect((err as MediaValidationError).code).toBe("too_large");
    expect(deleted).toHaveLength(1); // partial-object cleanup ran
    expect(saved.size).toBe(0);
    expect(creates).toHaveLength(0); // no registry row for a failed ingest
  });

  it("rejects disallowed content fast and cleans up", async () => {
    const { adapter, saved, deleted } = makeStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);

    const err = await service
      .ingest(Readable.from([Buffer.from("<!DOCTYPE html><script>")]), {
        kind: "user",
        userId: 1,
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaValidationError);
    expect((err as MediaValidationError).code).toBe("unsupported_type");
    expect(deleted).toHaveLength(1);
    expect(saved.size).toBe(0);
    expect(creates).toHaveLength(0);
  });

  // Regression (#344): a fast inspector rejection must not crash the process.
  // The earlier `makeStorage` consumes the stream *synchronously*, so it never
  // exercised the real adapter's shape — an async step (mkdir) BEFORE the reader
  // attaches. In that gap the inspector's `'error'` had no listener and an
  // unhandled stream error terminated the server. This adapter reproduces the
  // gap; the ingest must reject cleanly (415) instead.
  const makeGappyStorage = () => {
    const deleted: string[] = [];
    const adapter: StorageAdapter = {
      // Mirror the real local-disk adapter: an async step (mkdir) BEFORE the
      // reader attaches, and `pipeline` (not `for await`) as that reader — the
      // combination that turned a fast inspector rejection into an unhandled
      // process crash. `for await` would mask it; `pipeline` reproduces it.
      save: async (_key, data) => {
        await new Promise((resolve) => setImmediate(resolve)); // the mkdir gap
        await pipeline(data, new Writable({ write: (_c, _e, cb) => cb() }));
      },
      createReadStream: async () => Readable.from([]),
      exists: async () => false,
      delete: async (key) => {
        deleted.push(key);
      },
      enumerate: async () => [],
    };
    return { adapter, deleted };
  };

  it("rejects invalid content without crashing when the storage reader attaches late (#344)", async () => {
    const { adapter, deleted } = makeGappyStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);

    const err = await service
      .ingest(Readable.from([Buffer.from("<!DOCTYPE html><script>")]), { kind: "user", userId: 1 })
      .catch((e: unknown) => e);

    // The typed cause survives — not a generic stream-teardown error — and the
    // test process is still alive to make these assertions (the bug crashed it).
    expect(err).toBeInstanceOf(MediaValidationError);
    expect((err as MediaValidationError).code).toBe("unsupported_type");
    expect(deleted).toHaveLength(1); // partial-object cleanup still ran
    expect(creates).toHaveLength(0);
  });

  it("still ingests a valid file when the storage reader attaches late (#344)", async () => {
    const { adapter } = makeGappyStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);

    const result = await service.ingest(Readable.from([PNG_HEAD, Buffer.alloc(50)]), {
      kind: "user",
      userId: 7,
    });

    expect(result.contentType).toBe("image/png");
    expect(creates).toHaveLength(1);
  });

  it("rejects a truncated head (shorter than any full signature) via the final check", async () => {
    const { adapter } = makeStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);

    const err = await service
      .ingest(Readable.from([PNG_HEAD.subarray(0, 4)]), { kind: "user", userId: 1 })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaValidationError);
    expect(creates).toHaveLength(0);
  });

  it("accepts content of exactly the size limit (inclusive at-limit semantics)", async () => {
    const { adapter } = makeStorage();
    const { repo } = makeRepo();
    const service = createMediaService(adapter, repo);

    const filler = Buffer.alloc(MEDIA_MAX_SIZE_BYTES - PNG_HEAD.length);
    const result = await service.ingest(Readable.from([PNG_HEAD, filler]), {
      kind: "user",
      userId: 1,
    });
    expect(result.size).toBe(MEDIA_MAX_SIZE_BYTES);
  });

  it("propagates a source-stream failure and cleans up", async () => {
    const { adapter, deleted } = makeStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);

    const failing = new Readable({
      read() {
        this.push(PNG_HEAD);
        this.destroy(new Error("client aborted"));
      },
    });
    const err = await service
      .ingest(failing, { kind: "user", userId: 1 })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaIngestError); // wrapped → the boundary maps it to 400
    expect(creates).toHaveLength(0);
    expect(deleted).toHaveLength(1);
  });

});

describe("media service — read (resolution)", () => {
  const readObject = (over: Partial<MediaObject> = {}): MediaObject => ({
    id: 1,
    token: mintToken(),
    storageKey: storageKey("objects/x"),
    contentType: "image/png",
    size: 5,
    status: "ready",
    uploaderId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  const makeReadService = (
    object: MediaObject | null,
    opts: { bytes?: string; missing?: boolean } = {},
  ) => {
    const repo: IMediaRepository = {
      create: async () => { throw new Error("unused"); },
      findByToken: async () => object,
      findTokensByIds: async () => new Map(),
      usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
      addReference: async () => {},
      removeReference: async () => {},
      countReferences: async () => 0,
    lockAndFetchByTokens: async () => [],
    };
    const storage: StorageAdapter = {
      save: async () => {},
      createReadStream: async () => {
        if (opts.missing) throw MediaStorageError.notFound("objects/x");
        return Readable.from([Buffer.from(opts.bytes ?? "img")]);
      },
      exists: async () => true,
      delete: async () => {},
      enumerate: async () => [],
    };
    return createMediaService(storage, repo);
  };

  it("returns the byte stream and header facts for a ready object", async () => {
    const svc = makeReadService(readObject({ contentType: "image/webp", size: 3 }), { bytes: "abc" });
    const result = await svc.read(mintToken());
    expect(result.contentType).toBe("image/webp");
    expect(result.size).toBe(3);
    let body = "";
    for await (const chunk of result.stream) body += chunk;
    expect(body).toBe("abc");
  });

  it("throws not_found for an unknown token", async () => {
    const err = await makeReadService(null).read(mintToken()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MediaReadError);
    expect((err as MediaReadError).code).toBe("not_found");
  });

  it("throws gone for a deleted object", async () => {
    const err = await makeReadService(readObject({ status: "deleted" })).read(mintToken()).catch((e: unknown) => e);
    expect((err as MediaReadError).code).toBe("gone");
  });

  it("throws not_found for a pending (not-yet-servable) object", async () => {
    const err = await makeReadService(readObject({ status: "pending" })).read(mintToken()).catch((e: unknown) => e);
    expect((err as MediaReadError).code).toBe("not_found");
  });

  it("fails safe (not_found) and logs on registry/storage divergence", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = await makeReadService(readObject(), { missing: true }).read(mintToken()).catch((e: unknown) => e);
    expect((err as MediaReadError).code).toBe("not_found");
    expect(spy).toHaveBeenCalled(); // internally observable, without M11 machinery
    spy.mockRestore();
  });
});
