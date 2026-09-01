import { useCallback, useContext } from "react";
import { useNavigate, useSearchParams, type NavigateOptions } from "react-router-dom";
import { carrySearchParams } from "./carrySearchParams";
import { PreservedSearchParams } from "./preservedSearchParams";

/**
 * Navigating within auth.
 *
 * Every screen uses it instead of `useNavigate`, so carrying a parameter is a
 * property of the module rather than an obligation each call site has to
 * remember. A forgotten one fails silently, which is the failure this exists
 * to remove.
 */
export const useAuthNavigate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preserved = useContext(PreservedSearchParams);

  return useCallback(
    (to: string, options?: NavigateOptions) =>
      navigate(carrySearchParams(to, preserved, searchParams), options),
    [navigate, preserved, searchParams],
  );
};
