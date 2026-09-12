import { confirmChallenge, issueChallenge } from "./channelVerification";
import type { VerificationRepository } from "./VerificationRepository";

export const restVerification = (
  issue = issueChallenge,
  confirm = confirmChallenge,
): VerificationRepository => ({
  issue: () => issue(),
  confirm: (code) => confirm(code),
});
