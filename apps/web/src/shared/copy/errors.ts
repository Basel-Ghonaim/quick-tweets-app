/** What a failure says when the screen that met it has nothing more specific to say. */
export const ERROR_COPY = {
  bad_request: "Bad request. Please check your input.",
  unauthorized: "Unauthorized. Please log in to continue.",
  forbidden: "Forbidden. You do not have permission to perform this action.",
  not_found: "Resource not found. The requested item does not exist.",
  timeout: "Request timed out. Please try again later.",
  conflict: "Conflict occurred. The resource already exists or has been modified.",
  payload_too_large: "Payload too large. The file or data sent is too big.",
  unsupported_media_type: "Unsupported media type. Please upload a valid format.",
  validation: "Validation failed. Please correct the highlighted errors.",
  too_many_requests: "Too many requests. Please slow down and try again later.",
  rate_limit: "Too many requests. Please slow down and try again later.",
  canceled: "The request was canceled.",
  server: "An internal server error occurred. Please try again later.",
  unknown: "An unexpected error occurred. Our team has been notified.",
  service_unavailable: "Service is temporarily unavailable. We are performing maintenance.",
  network: "A network error occurred. Please check your internet connection.",
} as const;
