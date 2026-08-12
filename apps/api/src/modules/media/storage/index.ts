/**
 * Storage — the module's byte-backend factory (ADR 0005 Decision 6).
 *
 * Owns construction/selection of the `StorageAdapter` backend: local-disk for now
 * (rooted at `UPLOAD_DIR`); selecting a different backend later happens here,
 * behind this same signature — callers are unaffected. Internal to Media, consumed
 * by ingest (`media.service`) and the reclamation job; not part of the
 * feature-facing public surface (`media/index.ts`), which no feature consumes.
 */

import { env } from "../../../config/env.js";
import type { StorageAdapter } from "../media.types.js";
import { createLocalDiskStorageAdapter } from "./local-disk.adapter.js";

export const createStorageAdapter = (
  baseDir: string = env.UPLOAD_DIR,
): StorageAdapter => createLocalDiskStorageAdapter({ baseDir });
