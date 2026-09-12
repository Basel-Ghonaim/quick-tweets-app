import type { AuthResponse } from "../model";

export interface SessionGateway {
  refresh: () => Promise<AuthResponse>;
  logout: () => Promise<void>;
}
