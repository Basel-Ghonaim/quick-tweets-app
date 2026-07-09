/**
 * The single source of deterministic auth validation constraints that the form
 * schemas read from. Pure data only — no React, components, Zod, or backend imports.
 *
 * The values mirror the backend schemas (auth.validator.ts), the current
 * reconciliation reference. Isolating them here is deliberate: a later review can
 * repoint this module at a shared cross-tier definition without touching the
 * schemas, the engine, or the components — where the constraints should ultimately
 * live is deferred to the Option C' review.
 */

/** Applied when a password is created (register); login never enforces this. */
export const newPasswordPolicy = {
  minLength: 8,
  maxLength: 72,
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[@$!%*?&#]/,
} as const;

/** Enforced when a username is created (register); login checks presence only. */
export const usernameRules = {
  minLength: 4,
  maxLength: 20,
  charset: /^[a-zA-Z0-9_]+$/,
} as const;

export const nameRules = {
  maxLength: 50,
} as const;
