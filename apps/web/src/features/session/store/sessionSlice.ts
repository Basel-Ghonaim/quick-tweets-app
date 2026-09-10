import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { initialSessionState } from "./state/sessionState";
import type {
  SessionEstablishedPayload,
  SignOutRejectedPayload,
} from "./types/sessionPayloads";

export const SESSION_SLICE_KEY = "session";

export const sessionSlice = createSlice({
  name: SESSION_SLICE_KEY,
  initialState: initialSessionState,
  reducers: {
    // One commit for every way a session is obtained; which way is not its to remember.
    sessionEstablished: (state, action: PayloadAction<SessionEstablishedPayload>) => {
      const { user, accessToken } = action.payload;
      if (user) state.user = user;
      if (accessToken) state.accessToken = accessToken;
      state.status = "settled";
    },

    sessionSettled: (state) => {
      state.status = "settled";
    },

    // Every dispatch is an answer — signed out, expired, revoked, or nothing to
    // restore — so the status stays settled rather than reverting to unknown.
    sessionEnded: () => ({ ...initialSessionState, status: "settled" as const }),

    signOutPending: (state) => {
      state.requests.signOut = { status: "loading", error: null };
    },

    signOutRejected: (state, action: PayloadAction<SignOutRejectedPayload>) => {
      state.requests.signOut = { status: "error", error: action.payload.error };
    },
  },
});

export const sessionActions = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
