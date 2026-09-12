import type { AuthResponseDto } from "./AuthResponseDto";
import type { AuthResponse } from "../model";

/** The one wire shape every session-yielding endpoint returns, as the domain sees it. */
export const toAuthResponse = (data: AuthResponseDto): AuthResponse => ({
  user: {
    id: data.user.id,
    username: data.user.username,
  },
  accessToken: data.accessToken,
});
