import { useAppDispatch } from "src/app/store/hooks";
import { authActions } from "../store";
import { restAuth } from "../repository/restAuth";
import type { AuthResponse } from "../entity";
import type { LoginCredentials, RegisterCredentials } from "../types";
import type { AuthRequestType } from "../store/types/AuthPayloads";

export const useAuthActions = () => {
  const dispatch = useAppDispatch();
  const { login, register } = restAuth();
  const { authRequestFulfilled, authRequestPending } = authActions;

  const executeAuthFlow = async (
    apiCall: () => Promise<AuthResponse>,
    requestType: AuthRequestType,
  ) => {
    try {
      dispatch(authRequestPending({ requestType }));
      const res = await apiCall();
      dispatch(
        authRequestFulfilled({
          requestType,
          token: res.token,
          user: res.user,
        }),
      );
    } catch (error) {
      console.log(error);
    }
  };

  return {
    login: (credentials: LoginCredentials) =>
      executeAuthFlow(() => login(credentials), "login"),
    register: (credentials: RegisterCredentials) =>
      executeAuthFlow(() => register(credentials), "register"),
  };
};
