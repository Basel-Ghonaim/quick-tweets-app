import { THEME_ATTRIBUTE, type ThemeName } from "@shared/design-system";

/** The chrome moves with the theme: an address bar in the previous one contradicts the page it frames. */
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
