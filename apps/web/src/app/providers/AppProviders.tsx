import type { ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { ThemeProvider } from "@shared/preferences";
import { reduxStore } from "../store";

/**
 * Step 2 of the composition root, which the frontend architecture already
 * describes as a fixed order — bootstrap, providers, the app shell — and which
 * had no file of its own.
 *
 * It exists so the entry point holds one child and cannot grow a second. Every
 * provider the product gains is nested here instead, which is also the only
 * place their order is decided.
 *
 * The order below is a claim, not an arrangement. The store is outermost
 * because a preference may come to be read from it; the theme sits above
 * anything that renders, since everything below is drawn in it. Where a later
 * provider belongs depends on what it renders and where — a provider that
 * portals its content from its own level puts that content outside anything
 * nested inside it — so the question is settled per provider, here.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ReduxProvider store={reduxStore}>
    <ThemeProvider>{children}</ThemeProvider>
  </ReduxProvider>
);
