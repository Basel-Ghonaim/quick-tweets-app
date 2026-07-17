/**
 * Media module — the upload grant (ADR 0007): minting and verification.
 *
 * The grant is a short-lived **bearer capability** — deliberately not a
 * session: it authorizes only "ingest up to `GRANT_MAX_OBJECTS` objects while
 * it lives, and adopt what it ingested", carries no subject identity, and is
 * spent at adoption. It exists so pre-auth flows (register-with-avatar) ingest
 * under an *identified* episode, never anonymously (ADR 0005 Decision 5).
 *
 * Representation (implementation choice per ADR 0007): a stateless HMAC-signed
 * JWT carrying a random grant id and a `typ` claim that separates it from auth
 * access tokens — the same signing key can never make one pass as the other.
 * Statelessness keeps minting write-free; the grant's liveness stays derivable
 * from Media's own state because ingest records `grantId` + `grantExpiresAt`
 * on the object (ADR 0007's abandonment-computability obligation).
 */

import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { MediaGrantError } from "./media.errors.js";

// ─── Policy data (values are implementation choices; bounds are ADR 0007's) ──

/** How long a minted grant lives. */
export const GRANT_TTL_SECONDS = 15 * 60; // 15 minutes

/** How many objects one grant may ingest (what the register flow needs). */
export const GRANT_MAX_OBJECTS = 1;

/** The claim separating upload grants from auth access tokens. */
const GRANT_TYP = "media_upload_grant";

export interface UploadGrant {
  /** Random, non-enumerable grant identity — recorded as uploader-provenance. */
  id: string;
  expiresAt: Date;
}

// ─── Mint / verify ───────────────────────────────────────────────────────────

/** Mint a fresh upload grant (the bearer string plus its expiry, for the client). */
export const mintUploadGrant = (): { grant: string; expiresAt: Date } => {
  const id = randomBytes(16).toString("base64url");
  const expiresAt = new Date(Date.now() + GRANT_TTL_SECONDS * 1000);
  const grant = jwt.sign({ gid: id, typ: GRANT_TYP }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: GRANT_TTL_SECONDS,
  });
  return { grant, expiresAt };
};

/**
 * Verify a presented grant and return its identity. Throws
 * `MediaGrantError('invalid_grant')` when malformed, expired, or not an
 * upload grant (e.g. an auth access token presented as a grant).
 */
export const verifyUploadGrant = (token: string): UploadGrant => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as { gid?: unknown; typ?: unknown; exp?: unknown };

    if (
      payload.typ !== GRANT_TYP ||
      typeof payload.gid !== "string" ||
      payload.gid.length === 0 ||
      typeof payload.exp !== "number"
    ) {
      throw new Error("not an upload grant");
    }
    return { id: payload.gid, expiresAt: new Date(payload.exp * 1000) };
  } catch {
    throw MediaGrantError.invalid();
  }
};
