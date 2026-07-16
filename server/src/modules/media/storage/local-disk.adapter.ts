/**
 * Media module — local-disk storage backend (the initial `StorageAdapter`).
 *
 * The only code in the module that touches physical storage. It maps a
 * `StorageKey` to a file beneath a configured base directory and performs byte
 * I/O with streams. It holds no authoritative runtime state — the filesystem
 * is the source of truth (ADR 0005).
 *
 * Internal: features never construct this directly; they obtain the configured
 * adapter via `createStorageAdapter()` (the module's `index.ts`).
 */

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { MediaStorageError } from "../media.errors.js";
import type { StorageAdapter, StorageKey } from "../media.types.js";

export interface LocalDiskStorageOptions {
  /** Root directory (absolute or cwd-relative) under which objects are stored. */
  baseDir: string;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createLocalDiskStorageAdapter = ({
  baseDir,
}: LocalDiskStorageOptions): StorageAdapter => {
  const root = path.resolve(baseDir);

  /** Resolve a key to an absolute path, guaranteeing it stays within `root`. */
  const resolveKeyPath = (key: StorageKey): string => {
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) {
      throw MediaStorageError.invalidKey(key);
    }
    return full;
  };

  return {
    save: async (key, data) => {
      const full = resolveKeyPath(key);
      await mkdir(path.dirname(full), { recursive: true });
      await pipeline(data, createWriteStream(full));
    },

    createReadStream: async (key) => {
      const full = resolveKeyPath(key);
      try {
        await stat(full);
      } catch (err) {
        if (isEnoent(err)) throw MediaStorageError.notFound(key);
        throw err;
      }
      return createReadStream(full);
    },

    exists: async (key) => {
      try {
        await stat(resolveKeyPath(key));
        return true;
      } catch (err) {
        if (isEnoent(err)) return false;
        throw err;
      }
    },

    delete: async (key) => {
      await rm(resolveKeyPath(key), { force: true });
    },
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Duck-type a Node "file not found" error without depending on its class. */
function isEnoent(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "ENOENT"
  );
}
