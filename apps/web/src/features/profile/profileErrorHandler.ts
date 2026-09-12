import { AppError, createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";

/**
 * Only what this screen can meet. It sends no username, so the `409` the
 * endpoint answers is not a refusal it can cause, and profile says nothing
 * about one.
 */
const PROFILE_MESSAGES: Partial<Record<AppError["type"], string>> = {
  validation: AUTH_COPY.profile.invalid,
  unauthorized: AUTH_COPY.profile.sessionExpired,
};

export const profileErrorHandler = (appError: AppError): AppError => {
  const message = PROFILE_MESSAGES[appError.type];

  return message ? createAppError(appError.type, message, appError.errors) : appError;
};
