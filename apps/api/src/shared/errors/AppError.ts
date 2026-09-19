/**
 * AppError — Typed error class for the backend.
 *
 * Purpose:
 * - Provides a consistent error shape across all layers (controller, service, middleware)
 * - Mirrors the frontend AppError contract so both sides speak the same error language
 * - Used by errorHandler middleware to format HTTP error responses
 */

import type { ErrorType } from "./types.js";

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

  /** 400 — Generic malformed request (not validation) */
  static badRequest(message: string) {
    return new AppError("bad_request", message, 400);
  }

  /** 401 — Not authenticated (missing or invalid token) */
  static unauthorized(message = "Authentication required") {
    return new AppError("unauthorized", message, 401);
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

  /** 410 — Resource permanently gone (e.g., deleted media) */
  static gone(message = "Gone") {
    return new AppError("gone", message, 410);
  }

  /** 413 — File or payload exceeds size limit */
  static payloadTooLarge(message = "Payload too large") {
    return new AppError("payload_too_large", message, 413);
  }

  /** 415 — Unsupported file format */
  static unsupportedMediaType(message = "Unsupported media type") {
    return new AppError("unsupported_media_type", message, 415);
  }

  /** 422 — Validation failure with field-level errors */
  static validation(message: string, errors?: Record<string, string[]>) {
    return new AppError("validation", message, 422, errors);
  }

  /** 429 — Rate limit exceeded */
  static tooManyRequests(message = "Too many requests") {
    return new AppError("too_many_requests", message, 429);
  }

  /** 500 — Internal server error */
  static server(message = "Internal server error") {
    return new AppError("server", message, 500);
  }

  /** 503 — Service temporarily unavailable */
  static serviceUnavailable(message = "Service unavailable") {
    return new AppError("service_unavailable", message, 503);
  }
}
