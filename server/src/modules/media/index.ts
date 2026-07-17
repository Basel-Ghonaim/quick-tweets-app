/**
 * Media module — the single published interface (ADR 0005 — Decision 2).
 *
 * Feature modules consume Media *only* through this file. It exposes the
 * storage-adapter port, the storage identifier and its constructor, the storage
 * error type, and a factory for the configured backend. The concrete backend,
 * the key→path mapping, and every other internal are deliberately not exported.
 */

import { env } from "../../config/env.js";
import { createLocalDiskStorageAdapter } from "./storage/local-disk.adapter.js";
import type { StorageAdapter } from "./media.types.js";

export type { StorageAdapter, StorageKey, MediaToken } from "./media.types.js";
export { storageKey } from "./media.keys.js";
export { mediaToken } from "./media.tokens.js";
export { MediaStorageError } from "./media.errors.js";
export type { MediaStorageErrorCode } from "./media.errors.js";

/**
 * Build the configured storage adapter. The backend is local-disk for now
 * (rooted at `UPLOAD_DIR`); selecting a different backend later happens here,
 * behind this same signature — callers are unaffected.
 */
export const createStorageAdapter = (
  baseDir: string = env.UPLOAD_DIR,
): StorageAdapter => createLocalDiskStorageAdapter({ baseDir });
