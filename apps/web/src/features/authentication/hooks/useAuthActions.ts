import { useDispatch } from "react-redux";
import { restAuth } from "../repository";
import { executeAuthFlow } from "../services";
import type { LoginCredentials, RegisterCredentials } from "../credentials";

export const useAuthActions = () => {
  const dispatch = useDispatch();
  const repo = restAuth();

  return {
    login: (credentials: LoginCredentials) =>
      executeAuthFlow(dispatch, () => repo.login(credentials), "login"),
    register: (credentials: RegisterCredentials) =>
      executeAuthFlow(dispatch, () => repo.register(credentials), "register"),
  };
};
