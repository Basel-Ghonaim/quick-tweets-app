/**
 * The vocabulary of the temporary auth design-comparison phase.
 *
 * `bootstrap` is the design the product currently ships; `proposed` is the one
 * under development. Both remain present for the whole design phase — the
 * bootstrap is the baseline every design decision is judged against, not a
 * failed design awaiting deletion.
 *
 * This whole directory is removed once the auth UX is approved.
 */

export const AUTH_DESIGN_MODES = ["bootstrap", "proposed"] as const;

export type AuthDesignMode = (typeof AUTH_DESIGN_MODES)[number];

/**
 * The current design is the default, so anyone running the app for reasons
 * unrelated to this phase is unaffected by it. `proposed` is opt-in.
 */
export const DEFAULT_AUTH_DESIGN_MODE: AuthDesignMode = "bootstrap";

/** The query parameter carrying the mode, e.g. `/auth/signin?design=proposed`. */
export const AUTH_DESIGN_PARAM = "design";

/**
 * The URL is the single source of truth for the mode, which is what lets two
 * browser tabs hold different modes at once. Persisting it to `localStorage`
 * would couple those tabs to one shared value and defeat the comparison this
 * infrastructure exists to provide — so nothing here writes to storage.
 *
 * Anything unrecognised resolves to the default rather than throwing: a
 * mistyped URL should show the working design, never an error.
 */
export const parseAuthDesignMode = (raw: string | null | undefined): AuthDesignMode => {
  const candidate = raw?.trim().toLowerCase();

  return AUTH_DESIGN_MODES.find((mode) => mode === candidate) ?? DEFAULT_AUTH_DESIGN_MODE;
};

/** The opposite mode — the toggle's only transition. */
export const oppositeAuthDesignMode = (mode: AuthDesignMode): AuthDesignMode =>
  mode === "bootstrap" ? "proposed" : "bootstrap";
