import type { ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { LanguageProvider, ThemeProvider } from "@shared/preferences";
import { reduxStore } from "../store";

/**
 * The composition root's second step, so the entry point holds one child and
 * the nesting order lives in one place.
 *
 * The language sits above everything, since it decides the words and the
 * direction the rest is drawn in; the theme sits above everything it colours.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>
    <ReduxProvider store={reduxStore}>
      <ThemeProvider>{children}</ThemeProvider>
    </ReduxProvider>
  </LanguageProvider>
);
