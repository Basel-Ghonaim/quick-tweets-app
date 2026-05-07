import type { AuthResponse } from "../entity";
import type { LoginCredentials, RegisterCredentials } from "../types";

export interface AuthRepository {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<string>;
}
