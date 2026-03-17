import type { AuthResponse } from "../entity/AuthResponse";
import type { LoginRequestCredentials } from "../entity/AuthRequest";

export interface AuthRepository {
  login: (data: LoginRequestCredentials) => Promise<AuthResponse>;
}
