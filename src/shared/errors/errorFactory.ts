import type { AppError, ErrorType } from "./AppError";

export const createAppError = (
  type: ErrorType,
  message: string,
  status?: number,
  errors?: unknown,
): AppError => {
  return {
    type,
    message,
    status,
    errors,
  };
};

export const createUnknownError = (error: unknown): AppError => {
  return createAppError("unknown", "something went wrong", undefined, error);
};
