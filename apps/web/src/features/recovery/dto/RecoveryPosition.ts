import type { RecoveryStep } from "../model";

export interface RecoveryPositionDto {
  step: RecoveryStep;
  maskedEndpoint: string | null;
  retryAfterSeconds: number;
  canResend: boolean;
}

export interface RequestCodeDto {
  email: string;
}

export interface ConfirmCodeDto {
  code: string;
}

export interface ApplyPasswordDto {
  newPassword: string;
}
