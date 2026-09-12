import { resendWindowAt } from "../model";
import type { IssuedChallenge, VerificationPosition } from "../model";
import type { CurrentChallengeDto, IssuedChallengeDto } from "./verificationDto";

export interface VerificationMapper {
  toPosition: (data: CurrentChallengeDto) => VerificationPosition;
  toIssuedChallenge: (data: IssuedChallengeDto) => IssuedChallenge;
}

/** The clock is read where the answer is, so the instant is anchored at the
 *  moment the server stated its wait rather than wherever it is later used. */
export const verificationMapper = (now = () => Date.now()): VerificationMapper => ({
  toPosition: (data) => ({
    status: data.status,
    resendAvailableAt: resendWindowAt(data.resendAvailableInSeconds, now()),
  }),

  toIssuedChallenge: (data) => ({
    resendAvailableAt: resendWindowAt(data.resendAvailableInSeconds, now()),
  }),
});
