/**
 * Global error handler middleware.
 *
 * Purpose:
 * - Catches all errors thrown in routes/services and formats a consistent JSON response
 * - Returns standardized error shape: { success: false, error: { type, message } }
 * - Differentiates between known AppErrors (typed) and unknown errors (500)
 * - Prevents stack traces from leaking to the client in production
 *
 * Response format:
 *   { success: false, error: { type: "validation", message: "..." } }
 */

import type { Request, Response, NextFunction } from "express";
import { AppError } from "../shared/errors/index.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Known application error — send typed response
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        type: err.type,
        message: err.message,
        ...(err.errors && { errors: err.errors }),
      },
    });
    return;
  }

  // Unknown error — log and return generic 500
  console.error("[ErrorHandler] Unhandled error:", err);

  res.status(500).json({
    success: false,
    error: {
      type: "server",
      message: "Internal server error",
    },
  });
};
