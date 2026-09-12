import { useEffect, useReducer } from "react";
import { AUTH_COPY } from "@shared/copy";
import {
  canResend as windowIsOpen,
  resendCooldownInitial,
  resendCooldownReducer,
} from "@shared/one-time-code";
import type { RecoveryPosition } from "../model";

/**
 * The seconds tick here; the number they start from is always the server's.
 * Re-seeded from the position itself rather than from its value, so an answer
 * repeating the same number still restarts the window.
 */
export const useResendWindow = (position: RecoveryPosition) => {
  const [state, tick] = useReducer(resendCooldownReducer, resendCooldownInitial);

  useEffect(() => {
    tick({ type: "started", seconds: position.resendAvailableIn });
  }, [position]);

  const counting = state.secondsLeft > 0;

  useEffect(() => {
    if (!counting) return;

    const id = setInterval(() => tick({ type: "ticked" }), 1000);
    return () => clearInterval(id);
  }, [counting]);

  return {
    secondsLeft: state.secondsLeft,
    isOpen: windowIsOpen(state),
    announcement: state.justEnded ? AUTH_COPY.recovery.resendReady : "",
  };
};
