/**
 * Media ingest service — orchestration tests (mock ports, real streams).
 *
 * The service is exercised with an in-memory StorageAdapter and repository so
 * every test drives real stream mechanics: head capture, mid-stream aborts,
 * partial-object cleanup, provenance recording, and per-grant bounds.
 */

import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { generateAccessToken } from "../../shared/utils/jwt.js";
import { MediaGrantError, MediaIngestError, MediaValidationError } from "./media.errors";
import { mintUploadGrant } from "./media.grants";
import { createMediaService } from "./media.service";
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
  };
  return { adapter, saved, deleted };
};

/** In-memory repository capturing creates; injectable per-grant counts. */
const makeRepo = (grantCounts: Record<string, number> = {}) => {
  const creates: NewMediaObject[] = [];
  const repo: IMediaRepository = {
    create: async (input) => {
      creates.push(input);
      const prov = input.provenance;
      const obj: MediaObject = {
        id: creates.length,
        token: mintToken(),
        storageKey: input.storageKey,
        contentType: input.contentType,
        size: input.size,
        status: "ready",
        uploaderId: "uploaderId" in prov ? prov.uploaderId : null,
        grantId: "grantId" in prov ? prov.grantId : null,
        grantExpiresAt: "grantId" in prov ? prov.grantExpiresAt : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return obj;
    },
    findByToken: async () => null,
    countByGrant: async (grantId) => grantCounts[grantId] ?? 0,
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

  it("ingests under a valid grant and records grant provenance", async () => {
    const { adapter } = makeStorage();
    const { repo, creates } = makeRepo();
    const service = createMediaService(adapter, repo);
    const { grant } = mintUploadGrant();

    await service.ingest(Readable.from([PNG_HEAD]), { kind: "grant", grant });

    const prov = creates[0]!.provenance;
    expect("grantId" in prov && prov.grantId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect("grantExpiresAt" in prov && prov.grantExpiresAt).toBeInstanceOf(Date);
  });

  it("rejects an exhausted grant before any byte is stored", async () => {
    const { adapter, saved } = makeStorage();
    const { grant } = mintUploadGrant();
    // Whatever id the grant has, report it as already used.
    const { repo } = makeRepo(new Proxy({}, { get: () => 1 }) as Record<string, number>);
    const service = createMediaService(adapter, repo);

    const err = await service
      .ingest(Readable.from([PNG_HEAD]), { kind: "grant", grant })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaGrantError);
    expect((err as MediaGrantError).code).toBe("grant_exhausted");
    expect(saved.size).toBe(0); // authorize-before-store
  });

  it("rejects an invalid grant (including an access token) before storing", async () => {
    const { adapter, saved } = makeStorage();
    const { repo } = makeRepo();
    const service = createMediaService(adapter, repo);

    const err = await service
      .ingest(Readable.from([PNG_HEAD]), {
        kind: "grant",
        grant: generateAccessToken(7),
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaGrantError);
    expect(saved.size).toBe(0);
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

  it("maps a unique-constraint violation (grant race backstop) to grant_exhausted", async () => {
    const { adapter, deleted } = makeStorage();
    const { grant } = mintUploadGrant();
    // countByGrant passes (0 < 1), but the create loses the concurrent race.
    const repo: IMediaRepository = {
      create: async () => {
        throw { code: "P2002" }; // Prisma unique-constraint shape
      },
      findByToken: async () => null,
      countByGrant: async () => 0,
    };
    const service = createMediaService(adapter, repo);

    const err = await service
      .ingest(Readable.from([PNG_HEAD]), { kind: "grant", grant })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaGrantError);
    expect((err as MediaGrantError).code).toBe("grant_exhausted");
    expect(deleted).toHaveLength(1); // partial object cleaned up
  });
});
