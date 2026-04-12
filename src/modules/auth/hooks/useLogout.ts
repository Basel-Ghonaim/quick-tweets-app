import { useEffect } from "react";
import { useAppSelector } from "@app/store";
import { useRequestState } from "@shared/hooks";
import { useAuthActions } from "./useAuthActions";

/**
 * NOTE: `isLoading` is intentionally absent. The `logout` action is
 * synchronous — it never dispatches `authRequestPending`, so the loading
 * state will permanently remain `false`. When a server-side token revocation
 * call is added (refresh token support), this hook must be updated to handle
 * the async flow and expose `isLoading`.
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
