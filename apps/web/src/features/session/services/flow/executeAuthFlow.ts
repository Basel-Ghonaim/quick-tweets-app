import type { Dispatch } from "@reduxjs/toolkit";
import type { AppError } from "@shared/errors";
import { sessionActions, type AuthResponse } from "@shared/session";
import { authenticationActions, type AuthRequestType } from "../../store";
import { authErrorHandler } from "../authErrorHandler";

/** The one flow login and register share. Success is the server's answer alone;
 *  the session it yields is committed to the session, which owns it. */
export const executeAuthFlow = async (
  dispatch: Dispatch,
  apiCall: () => Promise<AuthResponse>,
  requestType: AuthRequestType,
): Promise<void> => {
  const { requestPending, requestFulfilled, requestRejected } = authenticationActions;

  try {
    dispatch(requestPending({ requestType }));
    const res = await apiCall();
    dispatch(sessionActions.sessionEstablished({ user: res.user, accessToken: res.accessToken }));
    dispatch(requestFulfilled({ requestType }));
  } catch (error) {
    const authError = authErrorHandler(error as AppError);
    dispatch(requestRejected({ requestType, error: authError.toSerialized() }));
    throw authError;
  }
};
