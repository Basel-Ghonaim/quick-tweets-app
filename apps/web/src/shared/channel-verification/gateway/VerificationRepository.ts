import type { IssuedChallenge } from "./channelVerification";

export interface VerificationRepository {
  issue: () => Promise<IssuedChallenge>;
  confirm: (code: string) => Promise<void>;
}
