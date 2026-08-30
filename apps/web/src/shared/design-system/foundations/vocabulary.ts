/**
 * The enumerated scales the presentation language is built from.
 *
 * They live in foundations because the semantic tier is *named* by them —
 * `--role-fill-<role>`, `--control-padding-inline-<size>` — and the check that
 * guards those names needs the same list, which a foundations check cannot import
 * from a component. Runtime arrays rather than bare unions, so the check iterates
 * the values instead of mirroring them.
 */

export const ROLES = [
  "primary",
  "secondary",
  "success",
  "warning",
  "error",
  "info",
] as const;

export type Role = (typeof ROLES)[number];

export const CONTROL_SIZES = ["small", "medium", "large"] as const;

export type ControlSize = (typeof CONTROL_SIZES)[number];

/** Emphasis within the reading order, never status — which is what separates a
 *  tone from a role. `--text-<tone>` is the semantic tier this names. */
export const TONES = [
  "primary",
  "secondary",
  "tertiary",
  "muted",
  "accent",
] as const;

export type Tone = (typeof TONES)[number];
