/**
 * The enumerated scales the presentation language is built from.
 *
 * They live in foundations rather than beside the components because the
 * semantic tier is *named* by them — `--control-fill-<role>`,
 * `--control-padding-inline-<size>` — so tokens and components must agree on one
 * list. The check that guards those token names needs the same list, and a
 * foundations check may not import a component.
 *
 * Exported as `as const` arrays rather than bare unions because the check
 * iterates them at runtime: a union alone would leave it mirroring the values.
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
