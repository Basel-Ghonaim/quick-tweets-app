import { useEffect } from "react";
import { useSessionSelector } from "../store/hooks";
import { selectSignOutRequest } from "../store";
import { useRequestState } from "@shared/hooks";
import { useAuthActions } from "./useAuthActions";

/**
 * Only `isError` is surfaced. A successful logout ends the session
 * (`sessionEnded`), so "signed out" is observed via `isLoggedIn` going false — there
 * is no logout request "success" state to expose. `isLoading` is likewise not
 * surfaced (no caller needs a logout spinner yet); it can be read from
 * `useRequestState` when one does.
 */
export const useLogout = () => {
  const { logout } = useAuthActions();

  const requestState = useSessionSelector(selectSignOutRequest);

  const { isError, error: logoutError } = useRequestState(requestState);

  useEffect(() => {
    if (logoutError) {
      // TODO: [Toast Epic] toast.error(logoutError?.message)
      console.error("[useLogout] Session clear failed:", logoutError);
    }
  }, [logoutError]);

  return {
    logout,
    isError,
  };
};
