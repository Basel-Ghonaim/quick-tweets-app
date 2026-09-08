import type { Dispatch } from "@reduxjs/toolkit";
import type { AppError } from "@shared/errors";
import { authActions } from "../store";
import { authErrorHandler } from "../session";
import type { UpdatedProfile } from "./profile.types";

/**
 * Drives the dispatch it is given, so the flow is exercised without a renderer.
 * It commits no identity: a profile update changes neither the session nor the
 * token, and the handle it can return is the User domain's to own.
 */
export const executeProfileUpdate = async (
  dispatch: Dispatch,
  apiCall: () => Promise<UpdatedProfile>,
): Promise<void> => {
  const { authRequestPending, authRequestFulfilled, authRequestRejected } = authActions;
  const requestType = "updateProfile" as const;

  try {
    dispatch(authRequestPending({ requestType }));
    await apiCall();
    dispatch(authRequestFulfilled({ requestType }));
  } catch (error) {
    const handled = authErrorHandler(error as AppError);
    dispatch(authRequestRejected({ requestType, error: handled.toSerialized() }));
    throw handled;
  }
};
