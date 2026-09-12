import { authClient } from "@shared/api";
import { confirmChallenge, currentChallenge, issueChallenge } from "./channelVerification";
import { verificationMapper } from "./verificationMapper";
import type { VerificationRepository } from "./VerificationRepository";

export const restVerification = (
  client = authClient,
  mapper = verificationMapper(),
): VerificationRepository => ({
  current: async () => mapper.toPosition(await currentChallenge(client)),
  issue: async () => mapper.toIssuedChallenge(await issueChallenge(client)),
  confirm: (code) => confirmChallenge(code, client),
});
