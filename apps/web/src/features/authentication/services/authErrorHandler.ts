import { AppError, createAppError } from "@shared/errors";
import type { Catalogue } from "@shared/copy";

/** The words sign-in and registration refuse in, handed in from the active catalogue. */
export type AuthRefusals = Catalogue["auth"]["errors"];

export const authErrorHandler = (appError: AppError, refusals: AuthRefusals): AppError => {
  const messages: Partial<Record<AppError["type"], string>> = {
    // Form-level, and deliberately does not say which field was wrong.
    unauthorized: refusals.unauthorized,
    validation: refusals.validation,
    conflict: refusals.conflict,
    too_many_requests: refusals.tooManyRequests,
  };

  const { type, errors } = appError;
  const customMessage = messages[type];

  if (customMessage) {
    return createAppError(type, customMessage, errors);
  }

  return appError;
};
