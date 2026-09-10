import type { AuthResponse } from "./AuthResponse";

export interface SessionRepository {
  refresh: () => Promise<AuthResponse>;
  logout: () => Promise<void>;
}
