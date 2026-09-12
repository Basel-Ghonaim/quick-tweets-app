import type { AppError } from "@shared/errors";

/**
 * The two refusals mean different things here than they do to a form: one is
 * this address being asked about too soon, the other this client being told to
 * stop. The wording belongs to the consumer, which is the only side that knows
 * who is reading.
 */
export type VerificationMessages = Partial<Record<AppError["type"], string>>;

/** What the capability knows about the holder's own endpoint. */
export type VerificationStatus = "unproven" | "pending" | "proven";

export interface VerificationPosition {
  status: VerificationStatus;
  /** When another code may be asked for, or `null` when nothing is running. */
  resendAvailableAt: number | null;
}

export interface IssuedChallenge {
  resendAvailableAt: number | null;
}

export type VerificationRead =
  | { status: "unresolved" }
  | { status: "resolved"; position: VerificationPosition }
  | { status: "failed" };
