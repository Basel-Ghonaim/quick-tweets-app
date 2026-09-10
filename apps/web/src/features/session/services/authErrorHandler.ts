import { AppError, createAppError } from "@shared/errors";

const AUTH_MESSAGES: Partial<Record<AppError["type"], string>> = {
  // Form-level, and deliberately does not say which field was wrong.
  unauthorized: "Incorrect username/email or password.",
  validation: "Please review the highlighted fields to correct the errors.",
  conflict: "This account is already registered. Try logging in.",
  too_many_requests: "Too many failed attempts. Please wait a few minutes.",
};

export const authErrorHandler = (appError: AppError): AppError => {
  const { type, errors } = appError;
  const customMessage = AUTH_MESSAGES[type];

  if (customMessage) {
    return createAppError(type, customMessage, errors);
  }

  return appError;
};
