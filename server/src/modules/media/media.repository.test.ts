/**
 * Media registry repository — unit tests (mock Prisma via factory DI).
 *
 * Exercises the repository's own logic — token minting on create and the
 * row → branded-domain mapping — without a database, by injecting a minimal
 * fake for the single delegate it touches (`db.mediaObject`). The real
 * Prisma-backed behaviour is exercised end-to-end by the ingest/read Work Items.
 */

import { describe, expect, it } from "vitest";

import { createMediaRepository } from "./media.repository";
import { storageKey } from "./media.keys";
import { mintToken } from "./media.tokens";

const fakeRow = (over: Record<string, unknown> = {}) => ({
  id: 1,
  token: mintToken(),
  storageKey: "objects/avatar-1",
  contentType: "image/png",
  size: 1234,
  status: "ready",
  uploaderId: null,
  createdAt: new Date("2026-07-16T00:00:00.000Z"),
  updatedAt: new Date("2026-07-16T00:00:00.000Z"),
  ...over,
});

describe("media repository", () => {
  it("create() mints a token, persists the input, and maps to a branded MediaObject", async () => {
    let captured: { data: Record<string, unknown> } | undefined;
    const db = {
      mediaObject: {
        create: async (args: { data: Record<string, unknown> }) => {
          captured = args;
          return fakeRow(args.data);
        },
        findUnique: async () => null,
      },
    };

    const repo = createMediaRepository(db as never);
    const obj = await repo.create({
      storageKey: storageKey("objects/avatar-1"),
      contentType: "image/png",
      size: 1234,
      provenance: { uploaderId: 7 },
    });

    // a token was minted and handed to persistence, with its provenance
    expect(captured?.data.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(captured?.data.storageKey).toBe("objects/avatar-1");
    expect(captured?.data.contentType).toBe("image/png");
    expect(captured?.data.size).toBe(1234);
    expect(captured?.data.uploaderId).toBe(7);
    // the result is the branded domain object
    expect(obj.storageKey).toBe("objects/avatar-1");
    expect(obj.contentType).toBe("image/png");
    expect(obj.size).toBe(1234);
    expect(obj.status).toBe("ready");
    expect(obj.token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("findByToken() maps a found row, and returns null when absent", async () => {
    const row = fakeRow();
    const db = {
      mediaObject: {
        create: async () => row,
        findUnique: async (args: { where: { token: string } }) =>
          args.where.token === row.token ? row : null,
      },
    };

    const repo = createMediaRepository(db as never);

    const found = await repo.findByToken(row.token as never);
    expect(found?.token).toBe(row.token);

    const missing = await repo.findByToken(mintToken());
    expect(missing).toBeNull();
  });

});
