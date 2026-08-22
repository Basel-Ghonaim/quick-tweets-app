import { useCallback, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthDesignContext, type AuthDesignContextValue } from "./authDesignContext";
import {
  AUTH_DESIGN_PARAM,
  oppositeAuthDesignMode,
  parseAuthDesignMode,
  type AuthDesignMode,
} from "./authDesignMode";
import { AuthDesignToggle } from "./AuthDesignToggle";

interface AuthDesignProviderProps {
  children: ReactNode;
}

/**
 * Supplies the design mode to the whole of Auth, and renders the toggle that
 * changes it.
 *
 * It renders the control itself so that mounting this provider is the single
 * integration point: no existing auth component is touched, and removing the
 * infrastructure is deleting this directory plus one wrapper.
 *
 * The mode is derived from the URL on every render rather than mirrored into
 * component state. A second copy could disagree with the address bar, and the
 * address bar is what a second tab reads.
 */
export const AuthDesignProvider = ({ children }: AuthDesignProviderProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = parseAuthDesignMode(searchParams.get(AUTH_DESIGN_PARAM));

  const setMode = useCallback(
    (next: AuthDesignMode) => {
      /*
       * Built from the current parameters rather than replacing them: the auth
       * routes may carry others, and switching the design must not drop them.
       *
       * `replace` because toggling is a viewing preference, not navigation —
       * a comparison session would otherwise bury the real history under its
       * own back-button entries. It also keeps the route match identical, so
       * the tree re-renders without remounting and state above the switch
       * boundary survives the change.
       */
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.set(AUTH_DESIGN_PARAM, next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleMode = useCallback(() => {
    setMode(oppositeAuthDesignMode(mode));
  }, [mode, setMode]);

  const value = useMemo<AuthDesignContextValue>(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  return (
    <AuthDesignContext.Provider value={value}>
      {children}
      <AuthDesignToggle />
    </AuthDesignContext.Provider>
  );
};
