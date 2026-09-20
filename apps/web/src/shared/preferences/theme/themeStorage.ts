import { THEMES, type ThemeName } from "@shared/design-system";
import { storedChoice } from "../storage";

const stored = storedChoice("theme");

const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === "string" && THEMES.includes(value as ThemeName);

/** The stored choice, or `null` when none was made, it cannot be read, or nothing resolves it. */
export const readStoredTheme = (): ThemeName | null => {
  const value = stored.read();
  return isThemeName(value) ? value : null;
};

export const storeTheme = (theme: ThemeName): void => stored.write(theme);
