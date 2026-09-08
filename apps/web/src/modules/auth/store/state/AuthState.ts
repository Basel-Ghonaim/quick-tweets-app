import type { RequestState, AuthUser } from "@shared/types";

/** Whether the startup restore has finished asking. Before it settles, a signed-out
 *  reader and one whose session has not been fetched yet look identical. */
export type SessionStatus = "unknown" | "settled";

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  session: SessionStatus;
  requests: AuthRequests;
}

interface AuthRequests {
  login: RequestState;
  register: RequestState;
  logout: RequestState;
  updateProfile: RequestState;
}
