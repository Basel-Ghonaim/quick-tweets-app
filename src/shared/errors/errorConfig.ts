import type { ErrorConfig, ErrorType, HttpStatusCode } from "./types";

// Centralized Error Registry: Links each ErrorType to its status code and fallback message.
export const errorConfigMap: Record<ErrorType, ErrorConfig> = {
  bad_request: {
    status: 400,
    defaultMessage: "Bad request. Please check your input.",
  },
  unauthorized: {
    status: 401,
    defaultMessage: "Unauthorized. Please log in to continue.",
  },
  forbidden: {
    status: 403,
    defaultMessage:
      "Forbidden. You do not have permission to perform this action.",
  },
  not_found: {
    status: 404,
    defaultMessage: "Resource not found. The requested item does not exist.",
  },
  timeout: {
    status: 408,
    defaultMessage: "Request timed out. Please try again later.",
  },
  conflict: {
    status: 409,
    defaultMessage:
      "Conflict occurred. The resource already exists or has been modified.",
  },
  payload_too_large: {
    status: 413,
    defaultMessage: "Payload too large. The file or data sent is too big.",
  },
  unsupported_media_type: {
    status: 415,
    defaultMessage: "Unsupported media type. Please upload a valid format.",
  },
  validation: {
    status: 422,
    defaultMessage: "Validation failed. Please correct the highlighted errors.",
  },
  too_many_requests: {
    status: 429,
    defaultMessage: "Too many requests. Please slow down and try again later.",
  },
  canceled: { status: 499, defaultMessage: "The request was canceled." },
  server: {
    status: 500,
    defaultMessage:
      "An internal server error occurred. Please try again later.",
  },
  unknown: {
    status: -1,
    defaultMessage: "An unexpected error occurred. Our team has been notified.",
  },
  service_unavailable: {
    status: 503,
    defaultMessage:
      "Service is temporarily unavailable. We are performing maintenance.",
  },
  network: {
    status: 0,
    defaultMessage:
      "A network error occurred. Please check your internet connection.",
  },
};

export const httpErrorMap: Record<HttpStatusCode, ErrorType> = {
  [400]: "bad_request",
  [401]: "unauthorized",
  [403]: "forbidden",
  [404]: "not_found",
  [408]: "timeout",
  [409]: "conflict",
  [413]: "payload_too_large",
  [415]: "unsupported_media_type",
  [422]: "validation",
  [429]: "too_many_requests",
  [499]: "canceled",
  [500]: "server",
  [503]: "service_unavailable",
  [0]: "network",
  [-1]: "unknown",
};

export const getErrorConfigByStatus = (
  status: HttpStatusCode,
): ErrorConfig & { type: ErrorType } => {
  const type = httpErrorMap[status] || "unknown";

  return { ...errorConfigMap[type], type };
};
