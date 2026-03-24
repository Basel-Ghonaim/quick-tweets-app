import type { AppError } from "../../../../shared/errors";
import type { User } from "../../../../shared/types";

export interface AuthState {
  user: User | null;
  token: string | null;
  loggedIn: boolean;
  requests: AuthRequests;
}

interface AuthRequests {
  login: AuthRequest;
  register: AuthRequest;
  logout: AuthRequest;
}

interface AuthRequest {
  status: "idle" | "success" | "loading" | "error";
  error: AppError | null;
}
