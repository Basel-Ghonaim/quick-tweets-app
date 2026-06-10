/**
 * AppError — Typed error class for the backend.
 *
 * Current purpose:
 * - Provides a consistent error shape across all layers (controller, service, middleware)
 * - Mirrors the frontend AppError contract so both sides speak the same error language
 * - Used by errorHandler middleware to format HTTP error responses
 *
 * Future expansion:
 * - Add error `code` field for machine-readable error codes (e.g., "AUTH_INVALID_CREDENTIALS")
 * - Add `errors` field for validation errors (Record<string, string[]>)
 * - Add serialization method (.toJSON()) for consistent API responses
 */

export type ErrorType =
  | "validation"
  | "authentication"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "server";

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "AppError";

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** 400 — Bad input / validation failure */
  static validation(message: string, errors?: Record<string, string[]>) {
    return new AppError("validation", message, 400, errors);
  }

  /** 401 — Not authenticated (missing or invalid token) */
  static authentication(message = "Authentication required") {
    return new AppError("authentication", message, 401);
  }

  /** 403 — Authenticated but not authorized for this resource */
  static forbidden(message = "Access denied") {
    return new AppError("forbidden", message, 403);
  }

  /** 404 — Resource not found */
  static notFound(resource = "Resource") {
    return new AppError("not_found", `${resource} not found`, 404);
  }

  /** 409 — Resource conflict (e.g., username already taken) */
  static conflict(message: string) {
    return new AppError("conflict", message, 409);
  }

  /** 500 — Internal server error */
  static server(message = "Internal server error") {
    return new AppError("server", message, 500);
  }
}
