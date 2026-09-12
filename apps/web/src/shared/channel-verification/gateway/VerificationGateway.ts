import type { IssuedChallenge, VerificationPosition } from "../model";

export interface VerificationGateway {
  /** Where the holder stands. Never fails for want of a challenge: nothing
   *  outstanding is an answer, not a `404`. */
  current: () => Promise<VerificationPosition>;
  issue: () => Promise<IssuedChallenge>;
  confirm: (code: string) => Promise<void>;
}
