import type { AppError } from "@shared/errors";

/**
 * The two refusals mean different things here than they do to a form: one is
 * this address being asked about too soon, the other this client being told to
 * stop. The wording belongs to the consumer, which is the only side that knows
 * who is reading.
 */
export type VerificationMessages = Partial<Record<AppError["type"], string>>;
