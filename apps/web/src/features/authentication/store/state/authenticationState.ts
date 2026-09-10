import type { RequestState } from "@shared/types";

/** One slot per flow a reader starts; a restore or a refresh touches neither. */
export interface AuthenticationState {
  login: RequestState;
  register: RequestState;
}

export const initialAuthenticationState: AuthenticationState = {
  login: { status: "idle", error: null },
  register: { status: "idle", error: null },
};
