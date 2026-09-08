import { AppError, createAppError } from "@shared/errors";

export type VerificationMessages = Partial<Record<AppError["type"], string>>;

/**
 * The two refusals mean different things here than they do to a form: one is
 * this address being asked about too soon, the other this client being told to
 * stop. The wording belongs to the consumer, which is the only side that knows
 * who is reading.
 */
export const verificationErrorHandler = (
  appError: AppError,
  messages: VerificationMessages = {},
): AppError => {
  const message = messages[appError.type];

  return message ? createAppError(appError.type, message, appError.errors) : appError;
};
