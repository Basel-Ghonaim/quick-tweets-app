// Shared parsing utilities used by both axiosParser and rtkQueryParser.

import { createAppError } from "../errorFactory";
import { errorConfigMap, getErrorConfigByStatus } from "../errorConfig";
import type { AppError } from "../AppError";
import type { ErrorType, ValidationErrorsPayload } from "../types";

// Standard backend error response shape (shared across all parsers).
export interface BackendErrorBody {
  success: false;
  error: {
    type: string;
    message: string;
    errors?: ValidationErrorsPayload;
  };
}

/**
 * Builds an AppError from an HTTP status code and optional backend response data.
 * Uses frontend-driven messages from errorConfigMap exclusively.
 *
 * Priority:
 * 1. If backendType is a recognized ErrorType → use its config from errorConfigMap.
 * 2. Otherwise → fall back to reverse-lookup by HTTP status code.
 * 3. Validation errors are always forwarded from the backend payload.
 */
export const buildAppError = (
  status: number,
  backendType?: string,
  validationErrors?: ValidationErrorsPayload,
): AppError => {
  // If the backend sent a recognized ErrorType, use it directly
  if (backendType && backendType in errorConfigMap) {
    const type = backendType as ErrorType;

    return createAppError(type, errorConfigMap[type].defaultMessage, validationErrors);
  }

  // Fallback: resolve by HTTP status code
  const resolved = getErrorConfigByStatus(
    status as Parameters<typeof getErrorConfigByStatus>[0],
  );

  return createAppError(resolved.type, resolved.defaultMessage, validationErrors);
};
