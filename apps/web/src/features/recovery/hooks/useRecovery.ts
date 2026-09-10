import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { restRecovery } from "../repository";
import { completeReset, resolveRecovery, type RecoveryRead } from "../services";
import type { RecoveryPosition } from "../entity";
import type { RecoveryRepository } from "../repository";

export interface Recovery {
  read: RecoveryRead;
  position: RecoveryPosition | null;
  request: (email: string) => Promise<void>;
  resend: () => Promise<void>;
  confirm: (code: string) => Promise<void>;
  apply: (newPassword: string) => Promise<void>;
  retry: () => void;
}

/**
 * The server's answer, held in one place and replaced by every answer it gives.
 * No readiness flag: these endpoints are anonymous, so unlike the journey there
 * is no session whose absence would be mistaken for an answer.
 */
export const useRecovery = (given?: RecoveryRepository): Recovery => {
  // Held across renders: the read effect is keyed on it, and a fresh one each
  // render would re-ask the position forever.
  const repo = useMemo(() => given ?? restRecovery(), [given]);
  const [read, setRead] = useState<RecoveryRead>({ status: "unresolved" });
  const [attempt, setAttempt] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    let live = true;
    void resolveRecovery(repo).then((next) => {
      if (live) setRead(next);
    });

    return () => {
      live = false;
    };
  }, [repo, attempt]);

  const settle = useCallback(
    (position: RecoveryPosition) => setRead({ status: "resolved", position }),
    [],
  );

  const request = useCallback(
    async (email: string) => settle(await repo.request(email)),
    [repo, settle],
  );

  const resend = useCallback(async () => settle(await repo.resend()), [repo, settle]);

  // Confirm answers with nothing, so the step is re-read rather than assumed —
  // deciding it here would make the client a second source for it.
  const confirm = useCallback(
    async (code: string) => {
      await repo.confirm(code);
      settle(await repo.position());
    },
    [repo, settle],
  );

  const apply = useCallback(
    (newPassword: string) => completeReset(dispatch, () => repo.apply(newPassword)),
    [dispatch, repo],
  );

  const retry = useCallback(() => {
    setRead({ status: "unresolved" });
    setAttempt((n) => n + 1);
  }, []);

  return {
    read,
    position: read.status === "resolved" ? read.position : null,
    request,
    resend,
    confirm,
    apply,
    retry,
  };
};
