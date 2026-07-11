import { useEffect } from "react";
import { useAppSelector } from "@app/store";
import { useRequestState } from "@shared/hooks";
import { useAuthActions } from "./useAuthActions";

/**
 * `isLoading` is intentionally not surfaced: no caller needs a logout spinner
 * yet. The logout request does pass through a real loading state, so it can be
 * added from `useRequestState` when a consumer needs one.
 */
export const useLogout = () => {
  const { logout } = useAuthActions();

  const requestState = useAppSelector((state) => state.auth.requests.logout);

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
