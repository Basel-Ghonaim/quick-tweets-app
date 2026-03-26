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
      const res = await api.post("/login", loginCredentialsToDto(credentials));
      return toAuthResponse(res.data);
    },
    register: async (credentials) => {
      const formData = new FormData();
      const dto = registerCredentialsToDto(credentials);
      Object.entries(dto).forEach(([key, value]) => {
        if (value !== null) formData.append(key, value);
      });

      const res = await api.post("/register", formData);
      return toAuthResponse(res.data);
    },
    logout: async () => {
      await authApi.post("/logout");
    },
  };
};
