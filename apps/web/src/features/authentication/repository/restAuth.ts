import type { AuthRepository } from "./AuthRepository";
import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import { toAuthResponse, type AuthResponseDto } from "@shared/session";
import { authMapper } from "../mapper";
import type { RegisterRequestDto } from "../dto";

export const restAuth = (authApi = authClient): AuthRepository => {
  const { loginCredentialsToDto, registerCredentialsToDto } = authMapper();

  return {
    login: async (credentials) => {
      const res = await authApi.post<ApiEnvelope<AuthResponseDto>>(
        "/auth/login",
        loginCredentialsToDto(credentials),
      );
      return toAuthResponse(unwrap(res));
    },
    register: async (credentials) => {
      const dto: RegisterRequestDto = registerCredentialsToDto(credentials);
      const res = await authApi.post<ApiEnvelope<AuthResponseDto>>("/auth/register", dto);
      return toAuthResponse(unwrap(res));
    },
  };
};
