import type { AuthRepository } from "./AuthRepository";
import { authClient, uploadAvatar, unwrap, type ApiEnvelope } from "@shared/api";
import { authMapper } from "../mapper";
import type { RegisterRequestDto, AuthResponseDto } from "../dto";

export const restAuth = (
  authApi = authClient,
  upload = uploadAvatar,
): AuthRepository => {
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
    register: async (credentials) => {
      const dto: RegisterRequestDto = registerCredentialsToDto(credentials);
      // Upload-then-submit-reference: when an avatar was chosen, upload it under a
      if (credentials.profileImage) {
        const { token, grant } = await upload(credentials.profileImage);
        dto.avatar = { token, grant };
      }
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
