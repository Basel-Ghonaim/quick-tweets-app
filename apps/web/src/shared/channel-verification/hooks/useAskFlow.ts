import { useCallback, useState } from "react";
import type { SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import type { RequestState } from "@shared/types";
import { restVerification } from "../gateway";
import { executeVerification } from "../services";
import type { VerificationMessages } from "../model";
import type { VerificationRepository } from "../gateway";

export interface AskFlowOptions {
  onSent?: (resendAvailableInSeconds: number) => void;
  repo?: VerificationRepository;
  messages?: VerificationMessages;
}

interface AskFlow {
  isSending: boolean;
  error: SerializedAppError | null;
  send: () => void;
}

const IDLE: RequestState = { status: "idle", error: null };

/**
 * The ask sends and then leaves, handing the window it was given to the screen
 * that needs it: the answer arrives here and is spent there.
 */
export const useAskFlow = ({
  onSent,
  repo = restVerification(),
  messages,
}: AskFlowOptions = {}): AskFlow => {
  const [request, setRequest] = useState<RequestState>(IDLE);
  const { isLoading, error } = useRequestState(request);

  const send = useCallback(() => {
    void executeVerification(setRequest, () => repo.issue(), messages)
      .then(({ resendAvailableInSeconds }) => onSent?.(resendAvailableInSeconds))
      .catch(() => {});
  }, [messages, onSent, repo]);

  return { isSending: isLoading, error, send };
};
