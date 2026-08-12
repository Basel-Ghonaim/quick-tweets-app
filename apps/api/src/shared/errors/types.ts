export type ErrorType =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "gone"
  | "conflict"
  | "bad_request"
  | "too_many_requests"
  | "payload_too_large"
  | "unsupported_media_type"
  | "service_unavailable"
  | "server";
