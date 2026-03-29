import type { AxiosError } from "axios";
import type { AppError } from "../AppError";
import { createAppError } from "../errorFactory";
import type { ValidationErrorsPayload } from "../types";

export interface BackendErrorResponse {
  message?: string;
  errors?: ValidationErrorsPayload;
}

export const parseAxiosError = (
  error: AxiosError<BackendErrorResponse>,
): AppError | null => {
  const { response, code } = error;

  const backendMessage = response?.data?.message;
  const validationErrors = response?.data?.errors;

  if (response) {
    const status = response.status;

    switch (status) {
      case 400:
        return createAppError("bad_request", backendMessage || "Bad Request");
      case 401:
        return createAppError("unauthorized", backendMessage || "Unauthorized access");
      case 403:
        return createAppError("forbidden", backendMessage || "Forbidden access");
      case 404:
        return createAppError("not_found", backendMessage || "Resource not found");
      case 409:
        return createAppError("conflict", backendMessage || "Conflict occurred");
      case 413:
        return createAppError("payload_too_large", backendMessage || "File too large");
      case 415:
        return createAppError("unsupported_media_type", backendMessage || "Unsupported format");
      case 422:
        return createAppError("validation", backendMessage || "Validation Error", validationErrors);
      case 429:
        return createAppError("too_many_requests", backendMessage || "Too many requests");
      case 503:
        return createAppError("service_unavailable", backendMessage || "Service unavailable");
    }

    if (status >= 500) {
      return createAppError("server", backendMessage || "Server error occurred");
    }
  }

  switch (code) {
    case "ERR_CANCELED":
      return createAppError("canceled", "Request was canceled");
    case "ERR_NETWORK":
      return createAppError("network", "Network error occurred");
    case "ECONNABORTED":
      return createAppError("timeout", "Request timeout");
  }

  return null;
};
