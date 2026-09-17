import type { ErrorConfig, ErrorType, HttpStatusCode } from "./types";

// Centralized Error Registry: links each ErrorType to its status code. Its
// wording is content, supplied through `setupErrorMessages`.
export const errorConfigMap: Record<ErrorType, ErrorConfig> = {
  bad_request: { status: 400 },
  unauthorized: { status: 401 },
  forbidden: { status: 403 },
  not_found: { status: 404 },
  timeout: { status: 408 },
  conflict: { status: 409 },
  payload_too_large: { status: 413 },
  unsupported_media_type: { status: 415 },
  validation: { status: 422 },
  too_many_requests: { status: 429 },
  /* Also 429, and a different refusal: the edge limiter rather than a resource
     asking a caller to wait. The reverse lookup keeps the older of the two. */
  rate_limit: { status: 429 },
  canceled: { status: 499 },
  server: { status: 500 },
  unknown: { status: -1 },
  service_unavailable: { status: 503 },
  network: { status: 0 },
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
