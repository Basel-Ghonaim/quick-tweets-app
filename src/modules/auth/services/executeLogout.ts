import type { Dispatch } from "@reduxjs/toolkit";
import type { AppError } from "@shared/errors";
import { authActions } from "../store";
import { authErrorHandler } from "./authErrorHandler";


// The logout flow — the **server is the source of truth** for ending a session.

export const executeLogout = async (
  dispatch: Dispatch,
  logout: () => Promise<void>,
): Promise<void> => {
  dispatch(authActions.authRequestPending({ requestType: "logout" }));

  try {
    await logout();
    // Server confirmed the logout → clear the local session.
    dispatch(authActions.authLogout());
  } catch (error) {
    // Server did not confirm → do NOT sign out locally; surface the failure so
    // the user can decide whether to retry.
    dispatch(
      authActions.authRequestRejected({
        requestType: "logout",
        // Store the plain, serializable projection — never the AppError instance.
        error: authErrorHandler(error as AppError).toSerialized(),
      }),
    );
  }
};
