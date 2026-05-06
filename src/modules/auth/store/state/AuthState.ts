import type { RequestState, User } from "@shared/types";

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  requests: AuthRequests;
}

interface AuthRequests {
  login: RequestState;
  register: RequestState;
  logout: RequestState;
}
