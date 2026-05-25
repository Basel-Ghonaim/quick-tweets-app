// Error type taxonomy — maps each error category to an HTTP status code.

export type ErrorType =
  | "network"
  | "server"
  | "validation"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "canceled"
  | "timeout"
  | "conflict"
  | "too_many_requests"
  | "bad_request"
  | "unknown"
  | "payload_too_large"
  | "unsupported_media_type"
  | "service_unavailable";

export const httpStatusMap: Record<ErrorType, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  timeout: 408,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  validation: 422,
  too_many_requests: 429,
  canceled: 499,
  server: 500,
  unknown: 500,
  service_unavailable: 503,
  network: 0,
};

export type ValidationErrorsPayload = Record<string, string[]>;

export type ErrorPayload<T extends ErrorType> = T extends "validation"
  ? ValidationErrorsPayload
  : unknown;
