import type { AuthState } from "./AuthState";

export const initialState: AuthState = {
  // The session lives in Redux memory only and is restored from the server on
  // reload (POST /auth/refresh) — never seeded from local persistence.
  user: null,
  accessToken: null,
  session: "unknown",
  requests: {
    login: { status: "idle", error: null },
    register: { status: "idle", error: null },
    logout: { status: "idle", error: null },
  },
};
