import { useEffect, useState } from "react";
import { useAuthDispatch } from "../store/hooks";
import { restAuth } from "../repository/restAuth";
import { authActions } from "../store";

/**
 * Runs once on app startup to restore the auth session from the **server**, with
 * no dependency on any local persistence.
 *
 * The httpOnly refresh cookie re-issues the full session (access token + user)
 * via POST /auth/refresh; on success the user is hydrated into Redux. Any failure
 * (missing/expired cookie) leaves a clean logged-out state.
 */
export const useInitAuth = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const dispatch = useAuthDispatch();

  useEffect(() => {
    const init = async () => {
      try {
        const { user, accessToken } = await restAuth().refresh();
        dispatch(authActions.sessionHydrated({ user, accessToken }));
      } catch {
        // No valid session (missing/expired cookie) → ensure a clean logged-out state.
        dispatch(authActions.authLogout());
      }

      setIsInitializing(false);
    };

    init();
  }, [dispatch]);

  return { isInitializing };
};
