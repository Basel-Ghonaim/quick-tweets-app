import { DEFAULT_THEME, THEME_ATTRIBUTE, type ThemeName } from "@shared/design-system";

/**
 * The application side of the theme contract (ADR 0010 Decision 4).
 *
 * Carries no selection policy — no system preference, no persistence. It exists
 * to exercise the typed contract so it cannot drift from the set the CSS
 * resolves, not to choose a theme.
 */
export const applyTheme = (theme: ThemeName = DEFAULT_THEME): void => {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
};
