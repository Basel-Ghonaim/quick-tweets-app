import { useAuthDispatch } from "../../store/hooks";

import { restAuth } from "../repository";
import { executeAuthFlow, executeLogout } from "../services";
import type { LoginCredentials, RegisterCredentials } from "../session.types";

export const useAuthActions = () => {
  const dispatch = useAuthDispatch();
  const repo = restAuth();

  return {
    login: (credentials: LoginCredentials) =>
      executeAuthFlow(dispatch, () => repo.login(credentials), "login"),
    register: (credentials: RegisterCredentials) =>
      executeAuthFlow(dispatch, () => repo.register(credentials), "register"),
    logout: () => executeLogout(dispatch, () => repo.logout()),
  };
};
