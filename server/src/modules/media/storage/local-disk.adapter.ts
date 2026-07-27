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
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { MediaStorageError } from "../media.errors.js";
import { storageKey } from "../media.keys.js";
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

    enumerate: async () => {
      const keys: StorageKey[] = [];
      const walk = async (dir: string): Promise<void> => {
        let entries;
        try {
          entries = await readdir(dir, { withFileTypes: true });
        } catch (err) {
          if (isEnoent(err)) return; // no store written yet — nothing to enumerate
          throw err;
        }
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
            continue;
          }
          if (!entry.isFile()) continue;
          // Relative path → forward-slashed storage key. A file whose name is not
          // in the storage-key format was never a Media object; skip it.
          const rel = path.relative(root, full).split(path.sep).join("/");
          try {
            keys.push(storageKey(rel));
          } catch {
            continue;
          }
        }
      };
      await walk(root);
      return keys;
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
