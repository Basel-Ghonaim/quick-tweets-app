import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useRequestState } from "@shared/hooks";
import { useSessionSelector } from "./useSessionSelector";
import { selectSignOutRequest } from "../state/selectors";
import { executeLogout } from "../lifecycle/executeLogout";
import { restSession } from "../transport/restSession";

/** Only `isError` is surfaced: a successful sign-out is observed as `isLoggedIn`
 *  turning false, since ending the session is what it does. */
export const useLogout = () => {
  const dispatch = useDispatch();
  const requestState = useSessionSelector(selectSignOutRequest);
  const { isError, error: logoutError } = useRequestState(requestState);

  useEffect(() => {
    if (logoutError) {
      // TODO: [Toast Epic] toast.error(logoutError?.message)
      console.error("[useLogout] Session clear failed:", logoutError);
    }
  }, [logoutError]);

  return {
    logout: () => executeLogout(dispatch, () => restSession().logout()),
    isError,
  };
};
