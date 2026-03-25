import type { AuthState } from "./AuthState";

export const initialState: AuthState = {
  user: null,
  token: null,
  requests: {
    login: { status: "idle", error: null },
    register: { status: "idle", error: null },
    logout: { status: "idle", error: null },
  },
};
