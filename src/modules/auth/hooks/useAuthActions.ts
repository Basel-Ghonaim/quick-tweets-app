import { useAppDispatch } from "src/app/store/hooks";
import { authActions } from "../store";
import { restAuth } from "../repository/restAuth";
import type { AuthResponse } from "../entity";
import type { LoginCredentials, RegisterCredentials } from "../types";
import type { AuthRequestType } from "../store/types/AuthPayloads";
import { authSessionService } from "../services/authSessionService";
import { createAppError, type AppError } from "@shared/errors";
import { authErrorHandler } from "../services/authErrorHandler";

export const useAuthActions = () => {
  const dispatch = useAppDispatch();
  const { login, register } = restAuth();
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
      const isSessionSaved = saveAuthSession(res.token, res.user);
      if (!isSessionSaved) {
        throw createAppError("unknown", "Failed to save auth session");
      }
      dispatch(
        authRequestFulfilled({
          requestType,
          token: res.token,
          user: res.user,
        }),
      );
    } catch (error) {
      const authError = authErrorHandler(error as AppError);
      dispatch(authRequestRejected({ requestType, error: authError }));
    }
  };

  const logout = () => {
    const isSessionCleared = clearAuthSession();
    if (!isSessionCleared) {
      dispatch(
        authRequestRejected({
          requestType: "logout",
          error: createAppError("unknown", "Failed to clear auth session"),
        }),
      );
      return;
    }
    dispatch(authRequestFulfilled({ requestType: "logout" }));
  };

  return {
    login: (credentials: LoginCredentials) =>
      executeAuthFlow(() => login(credentials), "login"),
    register: (credentials: RegisterCredentials) =>
      executeAuthFlow(() => register(credentials), "register"),
    logout,
  };
};
