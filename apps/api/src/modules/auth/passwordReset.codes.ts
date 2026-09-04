/**
 * Password Reset — the code: minting, validation, and the digest it is
 * stored as.
 *
 * Copied from Channel Verification's construction, not imported from it
 * (ADR 0016 Decision 4) — the two mechanisms are identical, but nothing yet
 * justifies extracting a shared one from a single pair of instances.
 *
 * The plaintext code exists only in the message sent to the holder and in
 * the value they submit back; what is persisted is a digest, because a code
 * that travels by mail is more exposed than a token held in an HttpOnly
 * cookie.
 *
 * SHA-256 rather than a password hash: the input is high-entropy CSPRNG
 * output, not a human-chosen secret, so there is nothing for a slow KDF to
 * defend against — and a slow KDF on every submission would make a
 * rate-limited endpoint into a CPU amplifier.
 */

import { createHash, randomInt } from "node:crypto";

import { PasswordResetError } from "./passwordReset.errors.js";
import type { ResetCode, ResetCodeFormat } from "./passwordReset.types.js";

/**
 * Rejects a format that could not produce a meaningful code — no choice of
 * character, or no length at all.
 *
 * A sanity floor, not an entropy policy: it refuses formats that are
 * **broken**, never ones that are merely weak. How strong a code must be is
 * configuration (D1), not something this module holds an opinion on.
 */
const assertUsableFormat = ({ alphabet, length }: ResetCodeFormat): void => {
  if (new Set(alphabet).size < 2 || length < 1) {
    throw PasswordResetError.invalidFormat();
  }
};

/** Mint a fresh code drawn uniformly from `format`. */
export const mintResetCode = (format: ResetCodeFormat): ResetCode => {
  assertUsableFormat(format);
  const { alphabet, length } = format;
  let code = "";
  for (let i = 0; i < length; i += 1) {
    // randomInt rejection-samples, so no character is favoured by modulo bias.
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code as ResetCode;
};

/**
 * Validate and brand a submitted value — a cheap rejection before any
 * lookup. Throws when the value could not have been minted from `format`.
 */
export const resetCode = (value: string, format: ResetCodeFormat): ResetCode => {
  assertUsableFormat(format);

  const wellFormed =
    value.length === format.length &&
    [...value].every((character) => format.alphabet.includes(character));

  if (!wellFormed) {
    throw PasswordResetError.invalidCode();
  }
  return value as ResetCode;
};

/**
 * The form the code is persisted in, and the form a submitted code is looked
 * up by: this capability resolves the account FROM the digest rather than
 * comparing a submitted secret against one record's stored value, so it needs
 * no comparison of its own.
 */
export const digestResetCode = (code: ResetCode): string =>
  createHash("sha256").update(code).digest("hex");
