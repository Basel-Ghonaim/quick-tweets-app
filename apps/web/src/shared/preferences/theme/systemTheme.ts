import { DEFAULT_THEME, type ThemeName } from "@shared/design-system";

/**
 * The operating system's preference, which applies only while the reader has
 * not made one of their own.
 */
const DARK_QUERY = "(prefers-color-scheme: dark)";

const query = (): MediaQueryList | null => {
  try {
    return window.matchMedia(DARK_QUERY);
  } catch {
    return null;
  }
};

export const systemTheme = (): ThemeName =>
  query()?.matches ? "dark" : DEFAULT_THEME;

/** Calls back while the system preference changes; returns its own teardown. */
export const watchSystemTheme = (
  onChange: (theme: ThemeName) => void,
): (() => void) => {
  const media = query();
  if (!media) return () => {};

  const handle = (event: MediaQueryListEvent) =>
    onChange(event.matches ? "dark" : DEFAULT_THEME);

  media.addEventListener("change", handle);
  return () => media.removeEventListener("change", handle);
};
