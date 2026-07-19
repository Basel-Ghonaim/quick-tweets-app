import type { Dispatch } from "@reduxjs/toolkit";
import type { AppError } from "@shared/errors";
import { authActions, type AuthRequestType } from "../store";
import type { AuthResponse } from "../entity";
import { authErrorHandler } from "./authErrorHandler";

/**
 * The shared login / register flow.
 *
 * Authentication success is determined **solely by the server response**: on
 * success the authenticated state is committed; on failure a normalized error is
 * surfaced. There is no local session persistence — the session lives in Redux
 * and is restored from the server on reload (#258).
 *
 * Extracted from the `useAuthActions` hook so the single flow that login and
 * register share is the one owner of this policy and is unit-testable without a
 * DOM: it drives the `dispatch` it is given.
 */
export const executeAuthFlow = async (
  dispatch: Dispatch,
  apiCall: () => Promise<AuthResponse>,
  requestType: AuthRequestType,
): Promise<void> => {
  const { authRequestPending, authRequestFulfilled, authRequestRejected } =
    authActions;

  try {
    dispatch(authRequestPending({ requestType }));
    const res = await apiCall();
    dispatch(
      authRequestFulfilled({
        requestType,
        accessToken: res.accessToken,
        user: res.user,
      }),
    );
  } catch (error) {
    const authError = authErrorHandler(error as AppError);
    // Store the plain, serializable projection (Redux state must be serializable);
    dispatch(authRequestRejected({ requestType, error: authError.toSerialized() }));
    throw authError;
  }
};
