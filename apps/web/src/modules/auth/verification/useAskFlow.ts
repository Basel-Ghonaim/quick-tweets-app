import { useCallback } from "react";
import type { SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import { useAuthDispatch, useAuthSelector } from "../store/hooks";
import { restVerification } from "./restVerification";
import { executeVerification } from "./executeVerification";

interface AskFlow {
  isSending: boolean;
  error: SerializedAppError | null;
  send: () => void;
}

/**
 * The ask sends and then leaves, handing the window it was given to the screen
 * that needs it: the answer arrives here and is spent there.
 */
export const useAskFlow = (
  onSent?: (resendAvailableInSeconds: number) => void,
  repo = restVerification(),
): AskFlow => {
  const dispatch = useAuthDispatch();
  const { isLoading, error } = useRequestState(
    useAuthSelector((state) => state.auth.requests.issueCode),
  );

  const send = useCallback(() => {
    void executeVerification(dispatch, () => repo.issue(), "issueCode")
      .then(({ resendAvailableInSeconds }) => onSent?.(resendAvailableInSeconds))
      .catch(() => {});
  }, [dispatch, onSent, repo]);

  return { isSending: isLoading, error, send };
};
