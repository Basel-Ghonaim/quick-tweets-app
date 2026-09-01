import { AuthPage } from "./pages/AuthPage";
import { AuthLayout } from "./layout";
import { useAuthDesignMode } from "./_design";

/**
 * The one place the design mode is read, and the only one: each reader is
 * somewhere the eventual cleanup must visit.
 *
 * Selecting the shell is what makes "never blended" structural — the proposed
 * screens hang off the outlet only the proposed shell owns, so under the
 * current design they are never mounted.
 */
export const AuthShell = () => {
  const { mode } = useAuthDesignMode();

  return mode === "proposed" ? <AuthLayout /> : <AuthPage />;
};
