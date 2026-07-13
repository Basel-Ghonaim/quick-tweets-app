import { useAuthDispatch } from "../store/hooks";

import { restAuth } from "../repository/restAuth";
import { authActions } from "../store";
import { executeAuthFlow } from "../services";
import type { LoginCredentials, RegisterCredentials } from "../types";

export const useAuthActions = () => {
  const dispatch = useAuthDispatch();
  const repo = restAuth();
  const { authRequestPending, authRequestFulfilled } = authActions;

  const logout = async () => {
    try {
      dispatch(authRequestPending({ requestType: "logout" }));
      await repo.logout();
    } catch {
      // Even if the API call fails, the refresh cookie expires on its own.
    } finally {
      dispatch(authRequestFulfilled({ requestType: "logout" }));
    }
  };

  return {
    login: (credentials: LoginCredentials) =>
      executeAuthFlow(dispatch, () => repo.login(credentials), "login"),
    register: (credentials: RegisterCredentials) =>
      executeAuthFlow(dispatch, () => repo.register(credentials), "register"),
    logout,
  };
};
