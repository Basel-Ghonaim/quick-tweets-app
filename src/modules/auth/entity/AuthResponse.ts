import type { User } from "@shared/types";

export interface AuthResponse {
  user: User;
  accessToken: string;
}
