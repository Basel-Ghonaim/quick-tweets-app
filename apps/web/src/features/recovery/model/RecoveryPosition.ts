import type { RecoveryStep } from "../model/recovery.types";

export interface RecoveryPosition {
  step: RecoveryStep;
  maskedAddress: string | null;
  resendAvailableIn: number;
  canResend: boolean;
}
