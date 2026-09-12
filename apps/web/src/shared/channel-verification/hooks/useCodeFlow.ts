import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
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
import { executeVerification, resolveVerification } from "../services";
import { secondsUntilWindow } from "../model";
import type { VerificationMessages, VerificationRead } from "../model";
import type { VerificationGateway } from "../gateway";

export interface CodeFlowOptions {
  onVerified?: () => void;
  repo?: VerificationGateway;
  messages?: VerificationMessages;
  resendReadyMessage?: string;
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
 * The wait is the server's, and it is asked for on arrival rather than handed
 * over: a reader who reloads resolves exactly as one who was just sent a code.
 * Until the answer arrives the resend is held, because offering it would invite
 * a refusal the server has already answered.
 */
export const useCodeFlow = ({
  onVerified,
  repo: given,
  messages,
  resendReadyMessage = "",
}: CodeFlowOptions = {}): CodeFlow => {
  // Held across renders: the read effect is keyed on it, and a fresh one each
  // render would ask forever.
  const repo = useMemo(() => given ?? restVerification(), [given]);

  const [issueRequest, setIssueRequest] = useState<RequestState>(IDLE);
  const [confirmRequest, setConfirmRequest] = useState<RequestState>(IDLE);
  const issue = useRequestState(issueRequest);
  const confirm = useRequestState(confirmRequest);

  const [code, setCodeRaw] = useState("");
  const [read, setRead] = useState<VerificationRead>({ status: "unresolved" });
  const [cooldown, tick] = useReducer(resendCooldownReducer, resendCooldownInitial);

  useEffect(() => {
    let live = true;

    void resolveVerification(repo).then((next) => {
      if (!live) return;

      setRead(next);
      if (next.status === "resolved") {
        tick({ type: "started", seconds: secondsUntilWindow(next.position.resendAvailableAt) });
      }
    });

    return () => {
      live = false;
    };
  }, [repo]);

  useEffect(() => {
    if (cooldown.secondsLeft === 0) return;

    const id = setInterval(() => tick({ type: "ticked" }), 1000);
    return () => clearInterval(id);
  }, [cooldown.secondsLeft]);

  const resend = useCallback(() => {
    void executeVerification(setIssueRequest, () => repo.issue(), messages)
      .then(({ resendAvailableAt }) =>
        tick({ type: "started", seconds: secondsUntilWindow(resendAvailableAt) }),
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
    canResend: read.status !== "unresolved" && canResend(cooldown),
    announcement: cooldown.justEnded ? resendReadyMessage : "",
    resend,
    submit,
  };
};
