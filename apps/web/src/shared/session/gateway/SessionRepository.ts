import type { AuthResponse } from "../model";

export interface SessionRepository {
  refresh: () => Promise<AuthResponse>;
  logout: () => Promise<void>;
}
