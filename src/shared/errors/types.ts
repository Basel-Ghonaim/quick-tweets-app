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
  | "econnaborted"
  | "bad_request"
  | "unknown";

export const httpStatusMap: Record<ErrorType, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  timeout: 408,
  econnaborted: 408,
  conflict: 409,
  too_many_requests: 429,
  validation: 422,
  canceled: 499,
  server: 500,
  unknown: 500,
  network: 502,
};

export type ValidationErrorsPayload = Record<string, string[]>;

export type ErrorPayload<T extends ErrorType> = T extends "validation"
  ? ValidationErrorsPayload
  : unknown;
