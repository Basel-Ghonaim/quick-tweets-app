import type { AuthResponse } from "@shared/session";
import type { LoginCredentials, RegisterCredentials } from "../credentials";

export interface AuthRepository {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
}
