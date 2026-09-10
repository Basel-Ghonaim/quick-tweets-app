import type { RequestState, AuthUser } from "@shared/types";

/** Whether the startup restore has finished asking. Before it settles, a signed-out
 *  reader and one whose session has not been fetched yet look identical. */
export type SessionStatus = "unknown" | "settled";

export interface SessionState {
  user: AuthUser | null;
  accessToken: string | null;
  status: SessionStatus;
  requests: {
    signOut: RequestState;
  };
}

/** Never seeded from local persistence: on reload the server says who is back. */
export const initialSessionState: SessionState = {
  user: null,
  accessToken: null,
  status: "unknown",
  requests: {
    signOut: { status: "idle", error: null },
  },
};
