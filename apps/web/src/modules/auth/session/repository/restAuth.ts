import type { AuthRepository } from "./AuthRepository";
import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import { authMapper } from "../mapper";
import type { RegisterRequestDto, AuthResponseDto } from "../dto";

export const restAuth = (authApi = authClient): AuthRepository => {
  const { toAuthResponse, loginCredentialsToDto, registerCredentialsToDto } =
    authMapper();

  return {
    login: async (credentials) => {
      const res = await authApi.post<ApiEnvelope<AuthResponseDto>>(
        "/auth/login",
        loginCredentialsToDto(credentials),
      );
      return toAuthResponse(unwrap(res));
    },
    // Auth-first (ADR 0008): registration is account creation only. The avatar is
    // no longer part of signup — no grant, no pre-auth upload. Avatar management
    // lives on the authenticated User/Profile surface (POST /media → PATCH /users/me).
    register: async (credentials) => {
      const dto: RegisterRequestDto = registerCredentialsToDto(credentials);
      const res = await authApi.post<ApiEnvelope<AuthResponseDto>>("/auth/register", dto);
      return toAuthResponse(unwrap(res));
    },
    logout: async () => {
      await authApi.post("/auth/logout");
    },
    refresh: async () => {
      const res = await authApi.post<ApiEnvelope<AuthResponseDto>>("/auth/refresh");
      return toAuthResponse(unwrap(res));
    },
  };
};
