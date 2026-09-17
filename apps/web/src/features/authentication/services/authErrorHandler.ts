import { AppError, createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";

const AUTH_MESSAGES: Partial<Record<AppError["type"], string>> = {
  // Form-level, and deliberately does not say which field was wrong.
  unauthorized: AUTH_COPY.errors.unauthorized,
  validation: AUTH_COPY.errors.validation,
  conflict: AUTH_COPY.errors.conflict,
  too_many_requests: AUTH_COPY.errors.tooManyRequests,
};

export const authErrorHandler = (appError: AppError): AppError => {
  const { type, errors } = appError;
  const customMessage = AUTH_MESSAGES[type];

  if (customMessage) {
    return createAppError(type, customMessage, errors);
  }

  return appError;
};
