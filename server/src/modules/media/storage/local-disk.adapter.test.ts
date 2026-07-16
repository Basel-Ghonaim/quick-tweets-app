/**
 * Local-disk storage adapter — unit tests (temp-dir backed).
 *
 * Exercises the byte-I/O contract (save/read round-trip, existence, idempotent
 * delete, not-found signalling) and the traversal-safety guarantee.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { createLocalDiskStorageAdapter } from "./local-disk.adapter";
import { MediaStorageError } from "../media.errors";
import { storageKey } from "../media.keys";
import type { StorageAdapter, StorageKey } from "../media.types";

const fromString = (s: string): Readable => Readable.from(Buffer.from(s, "utf8"));

const collect = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
};

describe("local-disk storage adapter", () => {
  let baseDir: string;
  let storage: StorageAdapter;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "media-store-"));
    storage = createLocalDiskStorageAdapter({ baseDir });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("round-trips bytes through save then read", async () => {
    const key = storageKey("objects/avatar-1");
    await storage.save(key, fromString("hello media"));

    expect(await storage.exists(key)).toBe(true);
    expect(await collect(await storage.createReadStream(key))).toBe("hello media");
  });

  it("reports non-existence before a save", async () => {
    expect(await storage.exists(storageKey("nope"))).toBe(false);
  });

  it("deletes idempotently", async () => {
    const key = storageKey("objects/tmp");
    await storage.save(key, fromString("x"));

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
    // Deleting an already-absent object must not throw.
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it("signals not_found when reading a missing key", async () => {
    const err = await storage
      .createReadStream(storageKey("missing"))
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaStorageError);
    expect((err as MediaStorageError).code).toBe("not_found");
  });

  it("rejects traversal and unsafe keys at construction", () => {
    expect(() => storageKey("../escape")).toThrow(MediaStorageError);
    expect(() => storageKey("a/../b")).toThrow(MediaStorageError);
    expect(() => storageKey("/absolute")).toThrow(MediaStorageError);
    expect(() => storageKey("")).toThrow(MediaStorageError);
  });

  it("never resolves a raw unsafe key outside the base directory", async () => {
    // Defense in depth: even a key that bypassed `storageKey()` cannot escape.
    const unsafe = "../escaped" as StorageKey;
    await expect(storage.save(unsafe, fromString("x"))).rejects.toBeInstanceOf(
      MediaStorageError,
    );
  });
});
