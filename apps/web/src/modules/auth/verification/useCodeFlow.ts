import { useCallback, useEffect, useReducer, useState } from "react";
import type { AppError, SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import { useAuthDispatch, useAuthSelector } from "../store/hooks";
import { restVerification } from "./restVerification";
import { executeVerification } from "./executeVerification";
import { normaliseChallengeCode } from "./challengeCode";
import { canResend, resendCooldownInitial, resendCooldownReducer } from "./resendCooldown";

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

/**
 * The wait is unknown on arrival, because a reader who reloads keeps the field
 * and loses the clock. Rather than guess it, the screen lets a resend ask: a
 * refusal answers with the seconds it has left, and an acceptance answers with
 * a fresh window. Either way the number is the server's.
 */
export const useCodeFlow = (
  onVerified?: () => void,
  repo = restVerification(),
  resendReadyMessage = "",
  openingWindow = 0,
): CodeFlow => {
  const dispatch = useAuthDispatch();
  const issue = useRequestState(useAuthSelector((s) => s.auth.requests.issueCode));
  const confirm = useRequestState(useAuthSelector((s) => s.auth.requests.confirmCode));

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
    void executeVerification(dispatch, () => repo.issue(), "issueCode")
      .then(({ resendAvailableInSeconds }) =>
        tick({ type: "started", seconds: resendAvailableInSeconds }),
      )
      .catch((refusal: AppError) => {
        if (refusal.retryAfterSeconds !== undefined) {
          tick({ type: "started", seconds: refusal.retryAfterSeconds });
        }
      });
  }, [dispatch, repo]);

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      void executeVerification(dispatch, () => repo.confirm(code), "confirmCode")
        .then(() => onVerified?.())
        .catch(() => {});
    },
    [code, dispatch, onVerified, repo],
  );

  return {
    code,
    setCode: (raw) => setCodeRaw(normaliseChallengeCode(raw)),
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
