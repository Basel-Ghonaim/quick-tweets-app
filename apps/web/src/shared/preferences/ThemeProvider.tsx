import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemeName } from "@shared/design-system";
import { ThemeContext } from "./themeContext";
import { applyTheme } from "./applyTheme";
import { readStoredTheme, storeTheme } from "./themeStorage";
import { systemTheme, watchSystemTheme } from "./systemTheme";

/**
 * Theme selection (ADR 0010 Decision 4): the Design System resolves a theme,
 * the application decides which one is active.
 *
 * An explicit choice wins and is remembered. Until one is made the operating
 * system leads — and keeps leading, so a reader who switches their machine to
 * dark at dusk sees the page follow rather than hold the value it read at load.
 * Choosing is what ends that.
 *
 * The initial value is read rather than assumed, because the pre-paint script
 * has already stamped the document from the same two sources; starting from a
 * default would re-stamp a different theme on hydration and reintroduce the
 * flash the script exists to remove.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [stored, setStored] = useState<ThemeName | null>(readStoredTheme);
  const [system, setSystem] = useState<ThemeName>(systemTheme);

  const theme = stored ?? system;

  useEffect(() => applyTheme(theme), [theme]);

  // Only while no choice has been made: a reader who has chosen has said the
  // system no longer speaks for them.
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
