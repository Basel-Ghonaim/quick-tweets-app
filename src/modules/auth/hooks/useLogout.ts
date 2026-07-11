import { useEffect } from "react";
import { useAuthSelector } from "../store/hooks";
import { useRequestState } from "@shared/hooks";
import { useAuthActions } from "./useAuthActions";

/**
 * `isLoading` is intentionally not surfaced: no caller needs a logout spinner
 * yet. The logout request does pass through a real loading state, so it can be
 * added from `useRequestState` when a consumer needs one.
 */
export const useLogout = () => {
  const { logout } = useAuthActions();

  const requestState = useAuthSelector((state) => state.auth.requests.logout);

  const {
    isSuccess,
    isError,
    error: logoutError,
  } = useRequestState(requestState);

  useEffect(() => {
    if (logoutError) {
      // TODO: [Toast Epic] toast.error(logoutError?.message)
      console.error("[useLogout] Session clear failed:", logoutError);
    }
  }, [logoutError]);

  return {
    logout,
    isSuccess,
    isError,
  };
};
