import { AuthPage } from "./pages/AuthPage";
import { AuthLayout } from "./layout";
import { useAuthDesignMode } from "./_design";

/**
 * The one place the design mode is read.
 *
 * The comparison is whole-design: either the current experience renders or the
 * proposed one does, and the two are never mixed. Selecting the shell here is
 * what makes that structural — the proposed screens hang off the outlet the
 * proposed shell owns, so under the current design they are never mounted and
 * there is nothing to blend.
 *
 * Being the only reader is the removal cost. Every call site is somewhere the
 * cleanup has to visit, so keeping the count at one keeps that cost a known
 * quantity rather than a search.
 */
export const AuthShell = () => {
  const { mode } = useAuthDesignMode();

  return mode === "proposed" ? <AuthLayout /> : <AuthPage />;
};
