import type { AuthResponse } from "@shared/session";
import type { LoginCredentials, RegisterCredentials } from "../model";

export interface AuthGateway {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
}
