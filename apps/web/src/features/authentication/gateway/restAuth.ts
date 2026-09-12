import type { AuthGateway } from "./AuthGateway";
import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import { toAuthResponse, type AuthResponseDto } from "@shared/session";
import { authMapper } from "./authMapper";
import type { RegisterRequestDto } from "./authDto";

export const restAuth = (authApi = authClient): AuthGateway => {
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
