/**
 * Channel Verification — the challenge code: minting, validation, and the
 * digest it is stored as.
 *
 * The plaintext code exists only in the message sent to the holder and in the
 * value they submit back; what is persisted is a digest, because a code that
 * travels by mail is more exposed than a token held in an HttpOnly cookie.
 *
 * SHA-256 rather than a password hash: the input is high-entropy CSPRNG output,
 * not a human-chosen secret, so there is nothing for a slow KDF to defend
 * against — and a slow KDF on every submission would make a rate-limited
 * endpoint into a CPU amplifier.
 */

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { ChannelVerificationError } from "./channelVerification.errors.js";
import type { ChallengeCode, ChallengeCodeFormat } from "./channelVerification.types.js";

/**
 * Rejects a format that could not produce a meaningful code — no choice of
 * character, or no length at all.
 *
 * A sanity floor, not an entropy policy: it refuses formats that are **broken**,
 * never ones that are merely weak. How strong a code must be is a product
 * decision this module deliberately does not hold.
 */
const assertUsableFormat = ({ alphabet, length }: ChallengeCodeFormat): void => {
  if (new Set(alphabet).size < 2 || length < 1) {
    throw ChannelVerificationError.invalidFormat();
  }
};

/** Mint a fresh code drawn uniformly from `format`. */
export const mintChallengeCode = (format: ChallengeCodeFormat): ChallengeCode => {
  assertUsableFormat(format);
  const { alphabet, length } = format;
  let code = "";
  for (let i = 0; i < length; i += 1) {
    // randomInt rejection-samples, so no character is favoured by modulo bias.
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code as ChallengeCode;
};

/**
 * Validate and brand a submitted value — a cheap rejection before any lookup.
 * Throws when the value could not have been minted from `format`.
 */
export const challengeCode = (
  value: string,
  format: ChallengeCodeFormat,
): ChallengeCode => {
  assertUsableFormat(format);

  const wellFormed =
    value.length === format.length &&
    [...value].every((character) => format.alphabet.includes(character));

  if (!wellFormed) {
    throw ChannelVerificationError.invalidCode();
  }
  return value as ChallengeCode;
};

/** The form the code is persisted in. */
export const digestChallengeCode = (code: ChallengeCode): string =>
  createHash("sha256").update(code).digest("hex");

/**
 * Whether `code` produced `storedHash`, compared without leaking how far the
 * two matched.
 */
export const challengeCodeMatches = (
  code: ChallengeCode,
  storedHash: string,
): boolean => {
  const candidate = Buffer.from(digestChallengeCode(code), "hex");
  const stored = Buffer.from(storedHash, "hex");

  // timingSafeEqual demands equal lengths; a stored value of another shape is a
  // mismatch, not an exception.
  if (candidate.length !== stored.length) return false;

  return timingSafeEqual(candidate, stored);
};
