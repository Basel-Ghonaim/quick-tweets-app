/**
 * Password Reset — the session key and the mask that travels beside it.
 *
 * The key addresses a reader's position; it authorizes nothing on its own. It
 * is stored as a digest for the same reason the code is: the plaintext reaches
 * a client, so nothing kept here can reconstruct one.
 */

import { createHash, randomBytes } from "node:crypto";

/** 256 bits, base64url — unguessable, and safe in a cookie value unencoded. */
export const mintSessionKey = (): string => randomBytes(32).toString("base64url");

export const digestSessionKey = (key: string): string =>
  createHash("sha256").update(key).digest("hex");

/**
 * What a returning reader is shown so they can recognise which address they
 * used. Produced here, where the address is held, so the unmasked value never
 * reaches a response.
 *
 * The local part keeps its first character and nothing else; the domain stays
 * whole, because a reader checking for a mistyped address needs to see it and
 * an attacker reading a stale cookie learns nothing they could not guess.
 */
export const maskEndpoint = (endpoint: string): string => {
  const at = endpoint.lastIndexOf("@");
  if (at < 1) return "•••";

  const local = endpoint.slice(0, at);
  const domain = endpoint.slice(at);

  return `${local[0]}${"•".repeat(Math.max(local.length - 1, 1))}${domain}`;
};
