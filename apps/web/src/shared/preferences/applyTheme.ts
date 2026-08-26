import { THEME_ATTRIBUTE, type ThemeName } from "@shared/design-system";

/**
 * Stamps the theme on the document, and keeps the browser's own chrome in step
 * with it — an address bar still painted in the previous theme contradicts the
 * page it frames.
 */
const CHROME_COLOR: Record<ThemeName, string> = {
  light: "#fafafe",
  dark: "#171424",
};

export const applyTheme = (theme: ThemeName): void => {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", CHROME_COLOR[theme]);
};
