import type {
  ApplyPasswordDto,
  ConfirmCodeDto,
  RecoveryPositionDto,
  RequestCodeDto,
} from "./recoveryDto";
import type { RecoveryPosition } from "../model";

export interface RecoveryMapper {
  toPosition: (data: RecoveryPositionDto) => RecoveryPosition;
  emailToDto: (email: string) => RequestCodeDto;
  codeToDto: (code: string) => ConfirmCodeDto;
  newPasswordToDto: (newPassword: string) => ApplyPasswordDto;
}

export const recoveryMapper = (): RecoveryMapper => ({
  toPosition: (data) => ({
    step: data.step,
    maskedAddress: data.maskedEndpoint,
    resendAvailableIn: data.retryAfterSeconds,
    canResend: data.canResend,
  }),

  emailToDto: (email) => ({ email }),
  codeToDto: (code) => ({ code }),
  newPasswordToDto: (newPassword) => ({ newPassword }),
});
