import type { VerificationStatus } from "./readVerificationStatus";

/** Where a reader arriving at the ask belongs, given what the server derives. */
export type AskDestination = "ask" | "code" | "done";

/**
 * A challenge already outstanding means the ask has nothing left to offer, and
 * asking again would only meet the cooldown. A read that failed leaves the
 * reader on the step rather than stranded by a question that could not be asked.
 */
export const verifyDestination = (status: VerificationStatus | null): AskDestination => {
  switch (status) {
    case "pending":
      return "code";
    case "proven":
      return "done";
    default:
      return "ask";
  }
};
