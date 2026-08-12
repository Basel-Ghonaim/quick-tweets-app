/**
 * Media module — the public `MediaToken`: minting and validation.
 *
 * The token is the opaque, non-enumerable, URL-safe external handle for a stored
 * object (`GET /media/:token`, ADR 0005 Decision 3). It is minted from CSPRNG
 * randomness and base64url-encoded so it is safe as a bare path segment. The
 * generator lives in one place (`mintToken`) so the scheme stays replaceable
 * without a pluggability abstraction; `mediaToken` validates an inbound value
 * before it is trusted as a lookup key.
 *
 * Opacity + non-enumerability are the settled ADR 0005 requirements; the CSPRNG
 * entropy here is a conservative default, not a stronger guarantee the ADR
 * mandates — any capability-grade unguessability would flow from the deferred
 * media access-posture decision, not from this Work Item.
 */

import { randomBytes } from "node:crypto";

import { MediaStorageError } from "./media.errors.js";
import type { MediaToken } from "./media.types.js";

const TOKEN_BYTES = 16; // 128 bits → 22 base64url characters
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** Mint a fresh opaque, non-enumerable, URL-safe token. */
export function mintToken(): MediaToken {
  return randomBytes(TOKEN_BYTES).toString("base64url") as MediaToken;
}

/**
 * Validate and brand an inbound token string (e.g. a `:token` route param).
 * Throws `MediaStorageError('invalid_token')` when the value is not a
 * well-formed token — a cheap rejection before any lookup.
 */
export function mediaToken(value: string): MediaToken {
  if (!TOKEN_PATTERN.test(value)) {
    throw MediaStorageError.invalidToken(value);
  }
  return value as MediaToken;
}
