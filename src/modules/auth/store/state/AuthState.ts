import type { RequestState, AuthUser } from "@shared/types";

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  requests: AuthRequests;
}

interface AuthRequests {
  login: RequestState;
  register: RequestState;
  logout: RequestState;
}
