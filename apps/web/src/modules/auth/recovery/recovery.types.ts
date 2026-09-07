/** Where the reader stands. `request` is also what an absent position answers. */
export type RecoveryStep = "request" | "code" | "password";

/**
 * What every recovery answer carries, so the step and the window can never come
 * from two sources. `retryAfterSeconds` is the position's own, never the
 * account's cooldown.
 */
export interface RecoveryPosition {
  step: RecoveryStep;
  maskedEndpoint: string | null;
  retryAfterSeconds: number;
  canResend: boolean;
}

export interface RecoveryRepository {
  /** Never fails for want of a position: an absent one answers `request`. */
  position(): Promise<RecoveryPosition>;
  request(email: string): Promise<RecoveryPosition>;
  /** Takes no address — the position holds it. */
  resend(): Promise<RecoveryPosition>;
  confirm(code: string): Promise<void>;
  /** Takes no code — the position holds that too. */
  apply(newPassword: string): Promise<void>;
}
