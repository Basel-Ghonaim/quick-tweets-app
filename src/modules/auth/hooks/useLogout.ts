import { useEffect } from "react";
import { useAuthSelector } from "../store/hooks";
import { useRequestState } from "@shared/hooks";
import { useAuthActions } from "./useAuthActions";

/**
 * Only `isError` is surfaced. A successful logout resets the whole auth slice
 * (`authLogout`), so "signed out" is observed via `isLoggedIn` going false — there
 * is no logout request "success" state to expose. `isLoading` is likewise not
 * surfaced (no caller needs a logout spinner yet); it can be read from
 * `useRequestState` when one does.
 */
export const useLogout = () => {
  const { logout } = useAuthActions();

  const requestState = useAuthSelector((state) => state.auth.requests.logout);

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
