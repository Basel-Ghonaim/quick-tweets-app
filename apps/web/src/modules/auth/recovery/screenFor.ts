import type { RecoveryStep } from "./recovery.types";
import type { RecoveryRead } from "./resolveRecovery";

/** What the recovery route shows. Every value is the server's or a wait for it. */
export type RecoveryScreen = "pending" | "retry" | RecoveryStep;

/**
 * A read that failed is not an answer of `request`: treating it as one would
 * send a reader back to the beginning of a recovery the server still holds.
 */
export const screenFor = (read: RecoveryRead): RecoveryScreen => {
  if (read.status === "unresolved") return "pending";
  if (read.status === "failed") return "retry";

  return read.position.step;
};
