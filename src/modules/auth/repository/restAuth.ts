import { apiClient } from "../../../shared/api";
import { loginCredentialsToDto } from "../mapper/authCredentialsToDto";
import { toAuthResponse } from "../mapper/toAuthResponse";
import type { AuthRepository } from "./AuthRepository";

export const restAuth = (): AuthRepository => ({
  login: async (data) => {
    loginCredentialsToDto(data);
    const response = await apiClient.post("/login", data);
    return toAuthResponse(response.data);
  },
});
