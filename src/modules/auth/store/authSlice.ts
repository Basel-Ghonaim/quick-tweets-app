import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { initialState } from "./state/initialState";
import type {
  AuthRequestPayload,
  AuthRequestFulfilledPayload,
  AuthRequestRejectedPayload,
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
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
