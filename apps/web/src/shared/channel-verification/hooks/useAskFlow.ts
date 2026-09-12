import { useCallback, useState } from "react";
import type { SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import type { RequestState } from "@shared/types";
import { restVerification } from "../gateway";
import { executeVerification } from "../services";
import type { VerificationMessages } from "../model";
import type { VerificationGateway } from "../gateway";

export interface AskFlowOptions {
  onSent?: () => void;
  repo?: VerificationGateway;
  messages?: VerificationMessages;
}

interface AskFlow {
  isSending: boolean;
  error: SerializedAppError | null;
  send: () => void;
}

const IDLE: RequestState = { status: "idle", error: null };

/**
 * The ask sends and then leaves. It hands nothing on: the screen that needs the
 * window asks the server for it when it arrives.
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
      .then(() => onSent?.())
      .catch(() => {});
  }, [messages, onSent, repo]);

  return { isSending: isLoading, error, send };
};
