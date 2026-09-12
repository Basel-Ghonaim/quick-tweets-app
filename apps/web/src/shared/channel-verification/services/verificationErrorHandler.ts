import { AppError, createAppError } from "@shared/errors";
import type { VerificationMessages } from "../model";

export const verificationErrorHandler = (
  appError: AppError,
  messages: VerificationMessages = {},
): AppError => {
  const message = messages[appError.type];

  return message ? createAppError(appError.type, message, appError.errors) : appError;
};
