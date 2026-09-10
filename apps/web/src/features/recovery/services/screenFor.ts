import type { RecoveryStep } from "../recovery.types";
import type { RecoveryRead } from "./resolveRecovery";

/** What the recovery route shows. Every value is the server's or a wait for it. */
export type RecoveryScreen = "pending" | "retry" | RecoveryStep;

/**
 * A read that failed is not an answer of `request`: treating it as one would
 * send a reader back to the beginning of a recovery the server still holds.
 *
 * `restarting` is the only thing a client may say about the step, and it says
 * the reader abandoned an attempt rather than that the server moved.
 */
export const screenFor = (read: RecoveryRead, restarting = false): RecoveryScreen => {
  if (read.status === "unresolved") return "pending";
  if (read.status === "failed") return "retry";

  return restarting ? "request" : read.position.step;
};
