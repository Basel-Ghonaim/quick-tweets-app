/**
 * Media module — the single published interface (ADR 0005 — Decision 2).
 *
 * Feature modules consume Media *only* through this file. It exposes the
 * storage-adapter port and factory, the identifier constructors and error types,
 * and — for feature consumers — the attach, reference-coordination, and resolution
 * surfaces. The concrete backend, the registry, the key→path mapping, and every
 * other internal are deliberately not exported.
 */

import { env } from "../../config/env.js";
import { createLocalDiskStorageAdapter } from "./storage/local-disk.adapter.js";
import type { StorageAdapter } from "./media.types.js";

export type { StorageAdapter, StorageKey, MediaToken, MediaUsage } from "./media.types.js";
export { storageKey } from "./media.keys.js";
export { mediaToken } from "./media.tokens.js";
export { MediaStorageError, MediaAttachError } from "./media.errors.js";
export type {
  MediaStorageErrorCode,
  MediaAttachErrorCode,
} from "./media.errors.js";

// Ownership authority (ADR 0005 Decision 5) — attach-authorization + usage
// accounting. See media.ownership.ts.
export { createMediaOwnership, mediaOwnership } from "./media.ownership.js";
export type {
  IMediaOwnership,
  AttachMediaInput,
  AttachableMedia,
} from "./media.ownership.js";

// Reference resolution (ADR 0005 Decision 3) — internal references back to
// public read tokens. Batched; servable objects only. See media.resolution.ts.
export { createMediaResolution, mediaResolution } from "./media.resolution.js";
export type { IMediaResolution } from "./media.resolution.js";

// Reference coordination (ADR 0005 Decision 8) — the feature signals that a
// reference begins/ends; Media owns the write. See media.references.ts.
export { createMediaReferences, mediaReferences } from "./media.references.js";
export type { IMediaReferences } from "./media.references.js";
export type { MediaReferenceInput } from "./media.types.js";

/**
 * Build the configured storage adapter. The backend is local-disk for now
 * (rooted at `UPLOAD_DIR`); selecting a different backend later happens here,
 * behind this same signature — callers are unaffected.
 */
export const createStorageAdapter = (
  baseDir: string = env.UPLOAD_DIR,
): StorageAdapter => createLocalDiskStorageAdapter({ baseDir });
