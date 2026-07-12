import { useEffect, useState } from "react";
import { useAuthDispatch } from "../store/hooks";
import { restAuth } from "../repository/restAuth";
import { authActions } from "../store";
import { authSessionService } from "../services";

/**
 * Runs once on app startup to restore the auth session.
 *
 * Flow:
 * 1. Check localStorage for cached user data (hint: was this person logged in?)
 * 2. If no user → skip (first visit or logged out)
 * 3. If user exists → call POST /auth/refresh (cookie sent automatically)
 *    - Success → store new accessToken in Redux → user stays logged in
 *    - Failure → cookie expired → clear stale user → show login
 */
export const useInitAuth = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const dispatch = useAuthDispatch();

  useEffect(() => {
    const init = async () => {
      const { getUser, clearAuthSession } = authSessionService();
      const cachedUser = getUser();

      if (!cachedUser) {
        // No previous session → skip refresh, go straight to login
        setIsInitializing(false);
        return;
      }

      try {
        const accessToken = await restAuth().refresh();
        dispatch(
          authActions.sessionHydrated({
            accessToken,
            user: cachedUser,
          }),
        );
      } catch {
        // Refresh token expired or invalid → clear stale user data
        clearAuthSession();
      }

      setIsInitializing(false);
    };

    init();
  }, [dispatch]);

  return { isInitializing };
};
