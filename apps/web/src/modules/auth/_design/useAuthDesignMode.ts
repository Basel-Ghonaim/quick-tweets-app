import { useContext } from "react";
import { AuthDesignContext, type AuthDesignContextValue } from "./authDesignContext";

/**
 * Reads the active design mode.
 *
 * **Call this only at a switch boundary** — the one place a Design Unit picks
 * between its bootstrap and proposed implementations. It is deliberately not
 * called inside either implementation: every call site is a place the eventual
 * cleanup must visit, so the number of call sites is the cost of removing this
 * infrastructure. Keeping it equal to the number of Design Units keeps that
 * cost a known quantity rather than a search.
 */
export const useAuthDesignMode = (): AuthDesignContextValue => {
  const context = useContext(AuthDesignContext);

  if (!context) {
    throw new Error(
      "useAuthDesignMode was called outside AuthDesignProvider. The provider wraps the auth routes in the composition root.",
    );
  }

  return context;
};
