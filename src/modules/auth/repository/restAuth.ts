import type { AuthRepository } from "./AuthRepository";
import { apiClient, authClient } from "../../../shared/api";
import { authMapper } from "../mapper";

export const restAuth = (): AuthRepository => {
  const { toAuthResponse, loginCredentialsToDto, registerCredentialsToDto } =
    authMapper();

  return {
    login: async (credintials) => {
      const res = await apiClient.post(
        "/login",
        loginCredentialsToDto(credintials),
      );
      return toAuthResponse(res.data);
    },
    register: async (credintials) => {
      const res = await apiClient.post(
        "/register",
        registerCredentialsToDto(credintials),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return toAuthResponse(res.data);
    },
    logout: async () => {
      await authClient.post("/logout");
    },
  };
};
