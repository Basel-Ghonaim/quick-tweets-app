import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useRequestState } from "@shared/hooks";
import { useSessionSelector } from "./useSessionSelector";
import { selectSignOutRequest } from "../state/selectors";
import { executeSignOut } from "../lifecycle/executeSignOut";
import { restSession } from "../transport/restSession";

/** Only `isError` is surfaced: a successful sign-out is observed as `isLoggedIn`
 *  turning false, since ending the session is what it does. */
export const useSignOut = () => {
  const dispatch = useDispatch();
  const requestState = useSessionSelector(selectSignOutRequest);
  const { isError, error: logoutError } = useRequestState(requestState);

  useEffect(() => {
    if (logoutError) {
      // TODO: [Toast Epic] toast.error(logoutError?.message)
      console.error("[useSignOut] Session clear failed:", logoutError);
    }
  }, [logoutError]);

  return {
    logout: () => executeSignOut(dispatch, () => restSession().logout()),
    isError,
  };
};
