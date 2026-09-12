import type { VerificationStatus } from "../model";

export interface IssuedChallengeDto {
  delivery: "accepted" | "refused" | "unknown";
  /** Whole seconds until this address may be issued another code. Read from the
   *  response because the cooldown is a server setting, not a client constant. */
  resendAvailableInSeconds: number;
}

export interface CurrentChallengeDto {
  status: VerificationStatus;
  resendAvailableInSeconds: number;
}
