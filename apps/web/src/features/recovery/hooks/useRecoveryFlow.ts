import { useCallback, useState } from "react";
import { useCopy } from "@shared/copy";
import { screenFor } from "../services";
import { useRecovery } from "./useRecovery";
import type { RecoveryPosition, RecoveryScreen } from "../model";

export interface RecoveryFlow {
  screen: RecoveryScreen;
  position: RecoveryPosition | null;
  notice?: string;
  confirmation?: string;
  initialEmail: string;
  ask: (email: string) => Promise<void>;
  restart: () => void;
  confirm: (code: string) => Promise<void>;
  resend: () => Promise<void>;
  apply: (newPassword: string) => Promise<void>;
  retry: () => void;
}

/**
 * What this client's own attempt adds to the server's answer: the address it
 * submitted, and whether the reader is correcting it rather than being sent
 * back. The address doubles as the record that an attempt was made, since a
 * submitted one is never empty.
 */
export const useRecoveryFlow = (
  onComplete?: () => void,
): RecoveryFlow => {
  const copy = useCopy();
  const { read, position, request, resend, confirm, apply, retry } = useRecovery();
  const [asked, setAsked] = useState("");
  const [restarting, setRestarting] = useState(false);

  const ask = useCallback(
    async (email: string) => {
      await request(email);
      setAsked(email);
      setRestarting(false);
    },
    [request],
  );

  const complete = useCallback(
    async (newPassword: string) => {
      await apply(newPassword);
      onComplete?.();
    },
    [apply, onComplete],
  );

  const restart = useCallback(() => setRestarting(true), []);

  return {
    screen: screenFor(read, restarting),
    position,
    notice: asked && !restarting ? copy.recovery.lapsed : undefined,
    confirmation: asked ? copy.recovery.sent : undefined,
    initialEmail: asked,
    ask,
    restart,
    confirm,
    resend,
    apply: complete,
    retry,
  };
};
