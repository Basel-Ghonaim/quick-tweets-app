import { createAppError, type AppError } from "@shared/errors";
import { useAppDispatch } from "@app/store";

import { restAuth } from "../repository/restAuth";
import { authActions, type AuthRequestType } from "../store";
import { authErrorHandler, authSessionService } from "../services";
import type { AuthResponse } from "../entity";
import type { LoginCredentials, RegisterCredentials } from "../types";

export const useAuthActions = () => {
  const dispatch = useAppDispatch();
  const repo = restAuth();
  const { authRequestFulfilled, authRequestPending, authRequestRejected } =
    authActions;
  const { saveAuthSession, clearAuthSession } = authSessionService();

  const executeAuthFlow = async (
    apiCall: () => Promise<AuthResponse>,
    requestType: AuthRequestType,
  ) => {
    try {
      dispatch(authRequestPending({ requestType }));
      const res = await apiCall();
      const isSessionSaved = saveAuthSession(res.user);
      if (!isSessionSaved) {
        throw createAppError("unknown", "Failed to save auth session");
      }
      dispatch(
        authRequestFulfilled({
          requestType,
          accessToken: res.accessToken,
          user: res.user,
        }),
      );
    } catch (error) {
      const authError = authErrorHandler(error as AppError);
      dispatch(authRequestRejected({ requestType, error: authError }));
      throw authError;
    }
  };

  const logout = async () => {
    try {
      dispatch(authRequestPending({ requestType: "logout" }));
      await repo.logout();
    } catch {
      // Even if API call fails, still clear local session.
      // The cookie will expire on its own.
    } finally {
      clearAuthSession();
      dispatch(authRequestFulfilled({ requestType: "logout" }));
    }
  };

  return {
    login: (credentials: LoginCredentials) =>
      executeAuthFlow(() => repo.login(credentials), "login"),
    register: (credentials: RegisterCredentials) =>
      executeAuthFlow(() => repo.register(credentials), "register"),
    logout,
  };
};
