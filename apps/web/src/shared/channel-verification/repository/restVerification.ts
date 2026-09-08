import { confirmChallenge, issueChallenge } from "@shared/api";
import type { VerificationRepository } from "./VerificationRepository";

export const restVerification = (
  issue = issueChallenge,
  confirm = confirmChallenge,
): VerificationRepository => ({
  issue: () => issue(),
  confirm: (code) => confirm(code),
});
