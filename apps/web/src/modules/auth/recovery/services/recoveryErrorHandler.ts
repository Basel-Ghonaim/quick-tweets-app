import { AppError, createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";

/**
 * Every refusal the capability makes is one opaque `400` — never issued,
 * expired, spent, wrong, or asked from a position that has none. Naming a
 * cause here would distinguish what the server deliberately does not.
 */
const RECOVERY_MESSAGES: Partial<Record<AppError["type"], string>> = {
  bad_request: AUTH_COPY.recovery.codeRejected,
  rate_limit: AUTH_COPY.recovery.rateLimited,
};

export const recoveryErrorHandler = (appError: AppError): AppError => {
  const message = RECOVERY_MESSAGES[appError.type];

  return message ? createAppError(appError.type, message, appError.errors) : appError;
};
