import { AppError, createAppError } from "@shared/errors";
import type { Catalogue } from "@shared/copy";

/** The words profile reports a failure in, handed in from the active catalogue. */
export type ProfileWords = Catalogue["auth"]["profile"];

/**
 * Only what this screen can meet. It sends no username, so the `409` the
 * endpoint answers is not a refusal it can cause, and profile says nothing
 * about one.
 */
export const profileErrorHandler = (appError: AppError, words: ProfileWords): AppError => {
  const messages: Partial<Record<AppError["type"], string>> = {
    validation: words.invalid,
    unauthorized: words.sessionExpired,
  };
  const message = messages[appError.type];

  return message ? createAppError(appError.type, message, appError.errors) : appError;
};
