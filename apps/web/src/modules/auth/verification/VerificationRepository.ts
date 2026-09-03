import type { IssuedChallenge } from "@shared/api";

export interface VerificationRepository {
  issue: () => Promise<IssuedChallenge>;
  confirm: (code: string) => Promise<void>;
}
