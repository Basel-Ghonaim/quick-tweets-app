import type { AuthUser } from "@shared/types";

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
