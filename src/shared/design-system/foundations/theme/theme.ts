/**
 * The theme contract: the Design System resolves, the application selects
 * (ADR 0010 Decision 4). Typing the name union is what stops a consumer naming
 * a theme the CSS does not resolve.
 */
export const THEMES = ["light", "dark"] as const;

export type ThemeName = (typeof THEMES)[number];

export const THEME_ATTRIBUTE = "data-theme";

export const DEFAULT_THEME: ThemeName = "light";
