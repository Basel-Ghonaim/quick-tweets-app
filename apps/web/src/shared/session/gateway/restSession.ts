import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { SessionRepository } from "./SessionRepository";
import type { AuthResponseDto } from "./AuthResponseDto";
import { toAuthResponse } from "./toAuthResponse";

export const restSession = (client = authClient): SessionRepository => ({
  refresh: async () => {
    const res = await client.post<ApiEnvelope<AuthResponseDto>>("/auth/refresh");
    return toAuthResponse(unwrap(res));
  },
  logout: async () => {
    await client.post("/auth/logout");
  },
});
