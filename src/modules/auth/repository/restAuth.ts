import type { AuthRepository } from "./AuthRepository";
import { apiClient, authClient } from "../../../shared/api";
import { authMapper } from "../mapper";

export const restAuth = (
  api = apiClient,
  authApi = authClient,
): AuthRepository => {
  const { toAuthResponse, loginCredentialsToDto, registerCredentialsToDto } =
    authMapper();

  return {
    login: async (credentials) => {
      const res = await api.post(
        "/auth/login",
        loginCredentialsToDto(credentials),
      );
      return toAuthResponse(res.data);
    },
    register: async (credentials) => {
      const dto = registerCredentialsToDto(credentials);
      const res = await api.post("/auth/register", dto);
      return toAuthResponse(res.data);
    },
    logout: async () => {
      await authApi.post("/auth/logout");
    },
  };
};
