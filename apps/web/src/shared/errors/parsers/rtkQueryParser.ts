import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { AppError } from "../AppError";
import { createAppError, createUnknownError } from "../errorFactory";
import { defaultMessageFor } from "../errorMessages";
import { buildAppError, type BackendErrorBody } from "./parserUtils";

/**
 * Type guard for RTK Query's FetchBaseQueryError.
 * Checks for the distinctive `status` property (string or number).
 */
export const isFetchBaseQueryError = (
  error: unknown,
): error is FetchBaseQueryError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (typeof (error as FetchBaseQueryError).status === "number" ||
      typeof (error as FetchBaseQueryError).status === "string")
  );
};

export const rtkQueryParser = (error: FetchBaseQueryError): AppError | null => {
  // RTK Query string statuses — library-specific transport errors
  if (typeof error.status === "string") {
    switch (error.status) {
      case "FETCH_ERROR":
        return createAppError("network", defaultMessageFor("network"));
      case "TIMEOUT_ERROR":
        return createAppError("timeout", defaultMessageFor("timeout"));
      case "PARSING_ERROR":
        return createUnknownError(new Error(error.error));
      case "CUSTOM_ERROR":
        return createUnknownError(error.error);
    }

    return null;
  }

  // Numeric HTTP status — delegate to shared helper
  const body = error.data as BackendErrorBody | undefined;
  const backendType = body?.error?.type;
  const validationErrors = body?.error?.errors;

  return buildAppError(error.status, backendType, validationErrors);
};
