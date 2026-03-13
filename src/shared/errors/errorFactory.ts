import type { AppError, ErrorType } from "./AppError";

export const createError = (
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
