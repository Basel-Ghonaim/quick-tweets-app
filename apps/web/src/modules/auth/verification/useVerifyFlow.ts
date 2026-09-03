import { useCallback, useEffect, useReducer, useState } from "react";
import type { SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import { useAuthDispatch, useAuthSelector } from "../store/hooks";
import { restVerification } from "./restVerification";
import { executeVerification } from "./executeVerification";
import { normaliseChallengeCode } from "./challengeCode";
import {
  canResend,
  resendCooldownInitial,
  resendCooldownReducer,
} from "./resendCooldown";

export type VerifyStage = "ask" | "code";

interface VerifyFlow {
  stage: VerifyStage;
  code: string;
  setCode: (raw: string) => void;
  isSending: boolean;
  isSubmitting: boolean;
  error: SerializedAppError | null;
  secondsLeft: number;
  canResend: boolean;
  /** Written only when the wait ends, so the live region speaks once. */
  announcement: string;
  send: () => void;
  submit: (event: React.FormEvent) => void;
}

export const useVerifyFlow = (
  onVerified?: () => void,
  repo = restVerification(),
  resendReadyMessage = "",
): VerifyFlow => {
  const dispatch = useAuthDispatch();
  const issueState = useAuthSelector((state) => state.auth.requests.issueCode);
  const confirmState = useAuthSelector((state) => state.auth.requests.confirmCode);

  const issue = useRequestState(issueState);
  const confirm = useRequestState(confirmState);

  const [stage, setStage] = useState<VerifyStage>("ask");
  const [code, setCodeRaw] = useState("");
  const [cooldown, tick] = useReducer(resendCooldownReducer, resendCooldownInitial);

  useEffect(() => {
    if (cooldown.secondsLeft === 0) return;

    const id = setInterval(() => tick({ type: "ticked" }), 1000);
    return () => clearInterval(id);
  }, [cooldown.secondsLeft]);

  const send = useCallback(() => {
    void executeVerification(dispatch, () => repo.issue(), "issueCode")
      .then(({ resendAvailableInSeconds }) => {
        tick({ type: "started", seconds: resendAvailableInSeconds });
        setStage("code");
      })
      .catch(() => {});
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
    stage,
    code,
    setCode: (raw) => setCodeRaw(normaliseChallengeCode(raw)),
    isSending: issue.isLoading,
    isSubmitting: confirm.isLoading,
    error: confirm.error ?? issue.error,
    secondsLeft: cooldown.secondsLeft,
    canResend: canResend(cooldown),
    announcement: cooldown.justEnded ? resendReadyMessage : "",
    send,
    submit,
  };
};
