/**
 * Media module — the `StorageKey` constructor and its traversal-safe format.
 *
 * The storage-key *layout* (what a key may contain, and hence how a backend
 * maps it to a location) is an M1 implementation choice — ADR 0005 leaves it
 * open. The format: one or more `/`-separated segments of `[A-Za-z0-9_-]`,
 * bounded in length; empty, `.`, and `..` segments are rejected, so a key can
 * never escape a backend's storage root. Opaque public-token minting is a
 * separate concern owned by the registry (M2).
 */

import { MediaStorageError } from "./media.errors.js";
import type { StorageKey } from "./media.types.js";

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
const MAX_KEY_LENGTH = 512;

/**
 * Validate and brand a raw string as a `StorageKey`. Throws
 * `MediaStorageError('invalid_key')` when the value is not a safe key.
 */
export function storageKey(value: string): StorageKey {
  const isValid =
    value.length > 0 &&
    value.length <= MAX_KEY_LENGTH &&
    value.split("/").every((segment) => SAFE_SEGMENT.test(segment));

  if (!isValid) {
    throw MediaStorageError.invalidKey(value);
  }
  return value as StorageKey;
}
