import { useDispatch } from "react-redux";
import { useCopy } from "@shared/copy";
import { restAuth } from "../gateway";
import { executeAuthFlow } from "../services";
import type { LoginCredentials, RegisterCredentials } from "../model";

export const useAuthActions = () => {
  const dispatch = useDispatch();
  const copy = useCopy();
  const repo = restAuth();

  return {
    login: (credentials: LoginCredentials) =>
      executeAuthFlow(dispatch, () => repo.login(credentials), "login", copy.auth.errors),
    register: (credentials: RegisterCredentials) =>
      executeAuthFlow(dispatch, () => repo.register(credentials), "register", copy.auth.errors),
  };
};
