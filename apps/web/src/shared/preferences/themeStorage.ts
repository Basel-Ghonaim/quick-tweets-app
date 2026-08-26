import { THEMES, type ThemeName } from "@shared/design-system";

/**
 * A bare string, not a serialised value: the reader that matters most cannot
 * import this module, because applying the theme before the first paint means
 * running before the bundle exists (Finding 0018). It has to understand the
 * stored value in one line, and a format the two read differently is the flash
 * returning by another route.
 *
 * Access is guarded because storage throws outright in some privacy modes.
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
