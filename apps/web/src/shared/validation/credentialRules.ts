/**
 * The deterministic constraints the form schemas read from. Pure data — no
 * React, no Zod, and no import of either tier's schemas.
 *
 * The server states the same constraints in its own validators, so a change
 * here is a change in two places.
 */

/** Applied when a password is created (register); login never enforces this. */
export const newPasswordPolicy = {
  minLength: 8,
  maxLength: 72,
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[@$!%*?&#]/,
  characters: /^[\x20-\x7E]*$/,
} as const;

/** The address the server accepts: Zod's email rule, restated because this tier has no Zod. */
export const emailRules = {
  format: /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/,
} as const;

/** Enforced when a username is created (register); login checks presence only. */
export const usernameRules = {
  minLength: 4,
  maxLength: 20,
  // Lowercase-only: uppercase is rejected rather than normalized, which is what
  // the handle resolver's stored-username invariant requires.
  charset: /^[a-z0-9_]+$/,
} as const;
