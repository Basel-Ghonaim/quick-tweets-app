// Factory functions for creating AppError instances.

import { AppError } from "./AppError";
import type { ErrorPayload, ErrorType } from "./types";

export const createAppError = <T extends ErrorType = ErrorType>(
  type: T,
  message: string,
  errors?: ErrorPayload<T>,
): AppError<T> => {
  return new AppError(type, message, errors);
};

export const createUnknownError = (error?: unknown): AppError<"unknown"> => {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return createAppError("unknown", message);
};
