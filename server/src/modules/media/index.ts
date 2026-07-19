/**
 * Media module — the single published interface (ADR 0005 — Decision 2).
 *
 * Feature modules consume Media *only* through this file. It exposes the
 * storage-adapter port and factory, the identifier constructors and error type,
 * and — for feature consumers — the adoption surface (attach a grant-provenance
 * object to an owner, and resolve a reference back to its read token). The
 * concrete backend, the registry, the key→path mapping, and every other internal
 * are deliberately not exported.
 */

import { env } from "../../config/env.js";
import { createLocalDiskStorageAdapter } from "./storage/local-disk.adapter.js";
import type { StorageAdapter } from "./media.types.js";

export type { StorageAdapter, StorageKey, MediaToken } from "./media.types.js";
export { storageKey } from "./media.keys.js";
export { mediaToken } from "./media.tokens.js";
export { MediaStorageError, MediaAdoptionError } from "./media.errors.js";
export type { MediaStorageErrorCode, MediaAdoptionErrorCode } from "./media.errors.js";

// Adoption (ADR 0007) — the feature-facing write. Consumers own the transaction;
// Media owns the semantics. See media.adoption.ts.
export { createMediaAdoption, mediaAdoption } from "./media.adoption.js";
export type { IMediaAdoption, AdoptMediaInput, AdoptedMedia } from "./media.adoption.js";

/**
 * Build the configured storage adapter. The backend is local-disk for now
 * (rooted at `UPLOAD_DIR`); selecting a different backend later happens here,
 * behind this same signature — callers are unaffected.
 */
export const createStorageAdapter = (
  baseDir: string = env.UPLOAD_DIR,
): StorageAdapter => createLocalDiskStorageAdapter({ baseDir });
