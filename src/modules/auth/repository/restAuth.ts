import type { AuthRepository } from "./AuthRepository";
import { authClient } from "@shared/api";
import { authMapper } from "../mapper";

export const restAuth = (authApi = authClient): AuthRepository => {
  const { toAuthResponse, loginCredentialsToDto, registerCredentialsToDto } =
    authMapper();

  return {
    login: async (credentials) => {
      const res = await authApi.post(
        "/auth/login",
        loginCredentialsToDto(credentials),
      );
      return toAuthResponse(res.data);
    },
    register: async (credentials) => {
      const dto = registerCredentialsToDto(credentials);
      const res = await authApi.post("/auth/register", dto);
      return toAuthResponse(res.data);
    },
    logout: async () => {
      await authApi.post("/auth/logout");
    },
    refresh: async () => {
      const res = await authApi.post("/auth/refresh");
      return toAuthResponse(res.data);
    },
  };
};
