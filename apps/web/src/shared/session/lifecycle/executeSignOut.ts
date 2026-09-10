import type { Dispatch } from "@reduxjs/toolkit";
import type { AppError } from "@shared/errors";
import { sessionActions } from "../state/sessionSlice";


// The logout flow — the **server is the source of truth** for ending a session.

export const executeSignOut = async (
  dispatch: Dispatch,
  logout: () => Promise<void>,
): Promise<void> => {
  dispatch(sessionActions.signOutPending());

  try {
    await logout();
    // Server confirmed the logout → clear the local session.
    dispatch(sessionActions.sessionEnded());
  } catch (error) {
    // Server did not confirm → do NOT sign out locally; surface the failure so
    // the user can decide whether to retry.
    dispatch(
      sessionActions.signOutRejected({
        // Worded by nobody: what a reader is told belongs to whoever renders it.
        error: (error as AppError).toSerialized(),
      }),
    );
  }
};
