import type { RecoveryMapper } from "./Mapper";

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
