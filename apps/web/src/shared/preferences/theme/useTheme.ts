import { useContext } from "react";
import { ThemeContext, type ThemePreference } from "./themeContext";

export const useTheme = (): ThemePreference => {
  const preference = useContext(ThemeContext);
  if (!preference)
    throw new Error("useTheme must be used within a ThemeProvider.");
  return preference;
};
