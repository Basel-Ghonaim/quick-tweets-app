import type { ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { ThemeProvider, useDocumentLanguage } from "@shared/preferences";
import { reduxStore } from "../store";

/**
 * The composition root's second step, so the entry point holds one child and
 * the nesting order lives in one place.
 *
 * The theme sits above everything that renders, because everything below is
 * drawn in it.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  useDocumentLanguage();

  return (
    <ReduxProvider store={reduxStore}>
      <ThemeProvider>{children}</ThemeProvider>
    </ReduxProvider>
  );
};
