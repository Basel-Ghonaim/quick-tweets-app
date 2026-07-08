/**
 * Deterministic auth validation constraints (frontend-local).
 *
 * This module owns only the *definitions* (numbers + patterns) of the auth
 * validation rules — not their execution and not their messages. Execution
 * lives in the schema-form engine's validators; messages live in
 * `validationMessages.ts`; composition lives in `authFormSchemas.ts`.
 *
 * These VALUES are the **current reconciliation reference**: they are aligned
 * to the backend schemas (`server/src/modules/auth/auth.validator.ts`), which
 * is today's reconciliation truth for the API contract. The backend is *not*
 * necessarily the permanent owner — where these deterministic constraints
 * should ultimately live (e.g. a single cross-tier definition) is an open
 * architectural question deferred to the Option C' review.
 *
 * C-ready seam: this module is the single place the rule source is defined, so
 * a later review can replace these values with a shared cross-tier definition
 * **without** changing the form schemas, the validation engine, or the
 * components that consume them. Keep it pure data only — no React, no form
 * components, no backend DTOs, no Zod, no cross-tier imports.
 */

/** Policy for a password being **created** (register today; reset/change later). */
export const newPasswordPolicy = {
  minLength: 8,
  maxLength: 72,
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[@$!%*?&#]/,
} as const;

/** Username format enforced at **creation** (register). Login only requires presence. */
export const usernameRules = {
  minLength: 4,
  maxLength: 20,
  charset: /^[a-zA-Z0-9_]+$/,
} as const;

/** Display-name bounds enforced at **creation** (register). */
export const nameRules = {
  maxLength: 50,
} as const;
