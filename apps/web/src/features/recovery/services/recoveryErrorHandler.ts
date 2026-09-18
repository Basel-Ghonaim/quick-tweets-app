import { AppError, createAppError } from "@shared/errors";
import type { Catalogue } from "@shared/copy";

/** The words recovery refuses in, handed in from the active catalogue. */
export type RecoveryWords = Catalogue["auth"]["recovery"];

/**
 * Every refusal the capability makes is one opaque `400` — never issued,
 * expired, spent, wrong, or asked from a position that has none. Naming a
 * cause here would distinguish what the server deliberately does not.
 */
export const recoveryErrorHandler = (appError: AppError, words: RecoveryWords): AppError => {
  const messages: Partial<Record<AppError["type"], string>> = {
    bad_request: words.codeRejected,
    rate_limit: words.rateLimited,
  };
  const message = messages[appError.type];

  return message ? createAppError(appError.type, message, appError.errors) : appError;
};
