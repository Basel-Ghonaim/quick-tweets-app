import { useCallback, useEffect, useReducer, useState } from "react";
import type { AppError, SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import {
  canResend,
  normaliseCode,
  resendCooldownInitial,
  resendCooldownReducer,
} from "@shared/one-time-code";
import type { RequestState } from "@shared/types";
import { restVerification } from "../gateway";
import { executeVerification } from "../services";
import type { VerificationMessages } from "../model";
import type { VerificationRepository } from "../gateway";

export interface CodeFlowOptions {
  onVerified?: () => void;
  repo?: VerificationRepository;
  messages?: VerificationMessages;
  resendReadyMessage?: string;
  openingWindow?: number;
}

interface CodeFlow {
  code: string;
  setCode: (raw: string) => void;
  isSubmitting: boolean;
  isResending: boolean;
  error: SerializedAppError | null;
  secondsLeft: number;
  canResend: boolean;
  announcement: string;
  resend: () => void;
  submit: (event: React.FormEvent) => void;
}

const IDLE: RequestState = { status: "idle", error: null };

/**
 * The wait is unknown on arrival, because a reader who reloads keeps the field
 * and loses the clock. Rather than guess it, the screen lets a resend ask: a
 * refusal answers with the seconds it has left, and an acceptance answers with
 * a fresh window. Either way the number is the server's.
 */
export const useCodeFlow = ({
  onVerified,
  repo = restVerification(),
  messages,
  resendReadyMessage = "",
  openingWindow = 0,
}: CodeFlowOptions = {}): CodeFlow => {
  const [issueRequest, setIssueRequest] = useState<RequestState>(IDLE);
  const [confirmRequest, setConfirmRequest] = useState<RequestState>(IDLE);
  const issue = useRequestState(issueRequest);
  const confirm = useRequestState(confirmRequest);

  const [code, setCodeRaw] = useState("");
  const [cooldown, tick] = useReducer(
    resendCooldownReducer,
    openingWindow > 0
      ? resendCooldownReducer(resendCooldownInitial, {
          type: "started",
          seconds: openingWindow,
        })
      : resendCooldownInitial,
  );

  useEffect(() => {
    if (cooldown.secondsLeft === 0) return;

    const id = setInterval(() => tick({ type: "ticked" }), 1000);
    return () => clearInterval(id);
  }, [cooldown.secondsLeft]);

  const resend = useCallback(() => {
    void executeVerification(setIssueRequest, () => repo.issue(), messages)
      .then(({ resendAvailableInSeconds }) =>
        tick({ type: "started", seconds: resendAvailableInSeconds }),
      )
      .catch((refusal: AppError) => {
        if (refusal.retryAfterSeconds !== undefined) {
          tick({ type: "started", seconds: refusal.retryAfterSeconds });
        }
      });
  }, [messages, repo]);

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      void executeVerification(setConfirmRequest, () => repo.confirm(code), messages)
        .then(() => onVerified?.())
        .catch(() => {});
    },
    [code, messages, onVerified, repo],
  );

  return {
    code,
    setCode: (raw) => setCodeRaw(normaliseCode(raw)),
    isSubmitting: confirm.isLoading,
    isResending: issue.isLoading,
    error: confirm.error ?? issue.error,
    secondsLeft: cooldown.secondsLeft,
    canResend: canResend(cooldown),
    announcement: cooldown.justEnded ? resendReadyMessage : "",
    resend,
    submit,
  };
};
