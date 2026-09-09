import { useCallback, useContext } from "react";
import { useNavigate, useSearchParams, type NavigateOptions } from "react-router-dom";
import { carrySearchParams } from "./carrySearchParams";
import { PreservedSearchParams } from "./preservedSearchParams";

/** Used instead of `useNavigate`: a call site that forgets to carry the
 *  parameter fails silently. */
export const useRouteNavigate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preserved = useContext(PreservedSearchParams);

  return useCallback(
    (to: string, options?: NavigateOptions) =>
      navigate(carrySearchParams(to, preserved, searchParams), options),
    [navigate, preserved, searchParams],
  );
};
