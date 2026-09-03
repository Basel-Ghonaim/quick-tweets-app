import type { Dispatch } from "@reduxjs/toolkit";
import type { AppError } from "@shared/errors";
import { authActions, type AuthRequestType } from "../store";
import { verificationErrorHandler } from "./verificationErrorHandler";

/** Drives the dispatch it is given, so the flow is exercised without a renderer.
 *  It commits no identity: proving an address changes no session. */
export const executeVerification = async <T>(
  dispatch: Dispatch,
  apiCall: () => Promise<T>,
  requestType: Extract<AuthRequestType, "issueCode" | "confirmCode">,
): Promise<T> => {
  const { authRequestPending, authRequestFulfilled, authRequestRejected } = authActions;

  try {
    dispatch(authRequestPending({ requestType }));
    const result = await apiCall();
    dispatch(authRequestFulfilled({ requestType }));
    return result;
  } catch (error) {
    const handled = verificationErrorHandler(error as AppError);
    dispatch(authRequestRejected({ requestType, error: handled.toSerialized() }));
    throw handled;
  }
};
