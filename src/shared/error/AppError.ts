export type ErrorType =
  | "network"
  | "server"
  | "validation"
  | "not_found"
  | "unauthorized"
  | "forbeden"
  | "canceled"
  | "timeout"
  | "econnaborted"
  | "bad_request"
  | "unknown";
export interface AppError {
  type: ErrorType;
  message: string;
  status?: number;
  errors?: unknown;
}
