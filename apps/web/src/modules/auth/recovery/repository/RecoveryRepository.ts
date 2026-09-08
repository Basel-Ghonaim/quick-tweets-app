import type { RecoveryPosition } from "../entity";

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
