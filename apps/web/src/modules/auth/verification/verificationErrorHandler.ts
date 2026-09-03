import { AppError, createAppError } from "@shared/errors";
import { AUTH_COPY } from "../config/copy";

/**
 * Verification has its own wording because the two refusals it meets mean
 * different things here than they do to a form: one is this address being
 * asked about too soon, the other is this client being asked to stop.
 */
const VERIFICATION_MESSAGES: Partial<Record<AppError["type"], string>> = {
  too_many_requests: AUTH_COPY.verify.cooldownRefused,
  rate_limit: AUTH_COPY.verify.rateLimited,
  bad_request: AUTH_COPY.verify.codeRejected,
};

export const verificationErrorHandler = (appError: AppError): AppError => {
  const message = VERIFICATION_MESSAGES[appError.type];

  return message ? createAppError(appError.type, message, appError.errors) : appError;
};
