// Error type taxonomy — defines the closed set of handled error types.
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

// Valid HTTP status codes returned by the backend or mapped internally (e.g., 0 for network)
export type HttpStatusCode =
  | 400
  | 401
  | 403
  | 404
  | 408
  | 409
  | 413
  | 415
  | 422
  | 429
  | 499
  | 500
  | 503
  | 0
  | -1;

export interface ErrorConfig {
  status: number;
  defaultMessage: string;
}

export type ValidationErrorsPayload = Record<string, string[]>;

export type ErrorPayload<T extends ErrorType> = T extends "validation"
  ? ValidationErrorsPayload
  : unknown;
