import type { AuthResponse } from "@shared/session";
import type { LoginCredentials, RegisterCredentials } from "../model";

export interface AuthRepository {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
}
