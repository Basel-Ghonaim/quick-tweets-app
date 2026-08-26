import { THEMES, type ThemeName } from "@shared/design-system";

/**
 * Where an explicit theme choice is kept, and the only place that knows how.
 *
 * The value is a bare string rather than anything serialised, because the
 * reader that matters most cannot use this module: applying the theme before
 * the first paint means running before the bundle exists (Finding 0018), and
 * that reader has to understand the stored value in one line of inline script.
 * A wrapped format would make the two disagree, which is the flash returning by
 * a different route.
 *
 * Every access is guarded. Storage throws outright in some privacy modes, and a
 * theme that cannot be remembered must still work for the visit.
 */
export const THEME_STORAGE_KEY = "quick-tweets:theme";

const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === "string" && THEMES.includes(value as ThemeName);

/** The stored choice, or `null` when none was made or storage is unreadable. */
export const readStoredTheme = (): ThemeName | null => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const storeTheme = (theme: ThemeName): void => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A choice that cannot be remembered still holds for this visit.
  }
};

/**
 * The trigger for extracting a shared storage layer is a *second* preference
 * that persists. One consumer whose hardest read path bypasses the layer would
 * shape it around the case it cannot serve.
 */
