import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { initialAuthenticationState } from "./state/authenticationState";
import { sessionActions } from "./sessionSlice";
import type {
  AuthRequestPayload,
  AuthRequestRejectedPayload,
} from "./types/authenticationPayloads";

export const AUTHENTICATION_SLICE_KEY = "authentication";

export const authenticationSlice = createSlice({
  name: AUTHENTICATION_SLICE_KEY,
  initialState: initialAuthenticationState,
  reducers: {
    requestPending: (state, action: PayloadAction<AuthRequestPayload>) => {
      state[action.payload.requestType] = { status: "loading", error: null };
    },
    requestFulfilled: (state, action: PayloadAction<AuthRequestPayload>) => {
      state[action.payload.requestType] = { status: "success", error: null };
    },
    requestRejected: (state, action: PayloadAction<AuthRequestRejectedPayload>) => {
      const { requestType, error } = action.payload;
      state[requestType] = { status: "error", error };
    },
    clearError: (state, action: PayloadAction<AuthRequestPayload>) => {
      const { requestType } = action.payload;
      if (state[requestType].status === "error") {
        state[requestType] = { status: "idle", error: null };
      }
    },
  },
  // Reacts to the session ending so a fresh sign-in never opens on a stale refusal.
  extraReducers: (builder) => {
    builder.addCase(sessionActions.sessionEnded, () => initialAuthenticationState);
  },
});

export const authenticationActions = authenticationSlice.actions;
export const authenticationReducer = authenticationSlice.reducer;
