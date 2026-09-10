import type { RecoveryStep } from "../recovery.types";

export interface RecoveryPositionDto {
  step: RecoveryStep;
  maskedEndpoint: string | null;
  retryAfterSeconds: number;
  canResend: boolean;
}
