import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemeName } from "@shared/design-system";
import { ThemeContext } from "./themeContext";
import { applyTheme } from "./applyTheme";
import { readStoredTheme, storeTheme } from "./themeStorage";
import { systemTheme, watchSystemTheme } from "./systemTheme";

/**
 * Theme selection (ADR 0010 Decision 4): the Design System resolves a theme,
 * the application decides which is active.
 *
 * The initial value is read rather than defaulted, because the pre-paint script
 * has already stamped the document from the same two sources — starting from a
 * default would re-stamp a different theme on hydration and put the flash back.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [stored, setStored] = useState<ThemeName | null>(readStoredTheme);
  const [system, setSystem] = useState<ThemeName>(systemTheme);

  const theme = stored ?? system;

  useEffect(() => applyTheme(theme), [theme]);

  // Only while no choice has been made: choosing says the system no longer
  // speaks for this reader.
  useEffect(() => {
    if (stored) return;
    return watchSystemTheme(setSystem);
  }, [stored]);

  const setTheme = useCallback((next: ThemeName) => {
    storeTheme(next);
    setStored(next);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, followsSystem: stored === null }),
    [theme, setTheme, stored],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
