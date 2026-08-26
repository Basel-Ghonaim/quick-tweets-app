import { createContext } from "react";
import type { ThemeName } from "@shared/design-system";

export interface ThemePreference {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  /** True while no explicit choice has been made, so the system still leads. */
  followsSystem: boolean;
}

/**
 * Undefined rather than a default value, so `useTheme` can tell "no provider"
 * from "a provider resolving to light" instead of silently returning a theme
 * nobody selected.
 */
export const ThemeContext = createContext<ThemePreference | undefined>(
  undefined,
);
