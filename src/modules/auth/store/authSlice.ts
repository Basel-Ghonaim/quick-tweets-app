import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { initialState } from "./state/initialState";
import type {
  AuthRequestPayload,
  AuthRequestFulfilledPayload,
  AuthRequestRejectedPayload,
  SessionHydratedPayload,
} from "./types/AuthPayloads";

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authRequestPending: (state, action: PayloadAction<AuthRequestPayload>) => {
      const { requestType } = action.payload;
      state.requests[requestType] = {
        status: "loading",
        error: null,
      };
    },
    authRequestFulfilled: (
      state,
      action: PayloadAction<AuthRequestFulfilledPayload>,
    ) => {
      const { requestType, user, accessToken } = action.payload;

      state.requests[requestType] = {
        status: "success",
        error: null,
      };

      if (user) state.user = user;
      if (accessToken) state.accessToken = accessToken;
    },
    authRequestRejected: (
      state,
      action: PayloadAction<AuthRequestRejectedPayload>,
    ) => {
      const { requestType, error } = action.payload;

      state.requests[requestType] = {
        error,
        status: "error",
      };
    },
    clearAuthError: (state, action: PayloadAction<AuthRequestPayload>) => {
      const { requestType } = action.payload;

      if (state.requests[requestType].status === "error") {
        state.requests[requestType] = {
          status: "idle",
          error: null,
        };
      }
    },
    authLogout: () => {
      return initialState;
    },

    // Identity-only update for silent session hydration — startup restore
    // (useInitAuth) and background token refresh (bootstrap.onTokenRefreshed).
    // Deliberately touches no request slot: those track user-initiated flows
    // (login/register/logout), so hydration must not mark `login` as succeeded.
    sessionHydrated: (state, action: PayloadAction<SessionHydratedPayload>) => {
      const { user, accessToken } = action.payload;
      if (user) state.user = user;
      if (accessToken) state.accessToken = accessToken;
    },
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
