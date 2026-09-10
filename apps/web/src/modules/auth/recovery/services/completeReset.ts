import type { Dispatch } from "@reduxjs/toolkit";
import { sessionActions } from "@features/session";

/** The reset revokes every session for the account, this browser's included, so
 *  the local one is cleared rather than left to earn a 401 on the next call. */
export const completeReset = async (
  dispatch: Dispatch,
  apply: () => Promise<void>,
): Promise<void> => {
  await apply();
  dispatch(sessionActions.sessionEnded());
};
