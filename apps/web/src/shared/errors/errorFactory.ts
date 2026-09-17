// Factory functions for creating AppError instances.

import { AppError } from "./AppError";
import { defaultMessageFor } from "./errorMessages";
import type { ErrorPayload, ErrorType } from "./types";

export const createAppError = <T extends ErrorType = ErrorType>(
  type: T,
  message: string,
  errors?: ErrorPayload<T>,
  retryAfterSeconds?: number,
): AppError<T> => {
  return new AppError(type, message, errors, retryAfterSeconds);
};

export const createUnknownError = (error?: unknown): AppError<"unknown"> => {
  const message =
    error instanceof Error ? error.message : defaultMessageFor("unknown");
  return createAppError("unknown", message);
};
