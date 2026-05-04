/**
 * Global error handler middleware.
 *
 * Current purpose:
 * - Catches all errors thrown in routes/services and formats a consistent JSON response
 * - Differentiates between known AppErrors (typed) and unknown errors (500)
 * - Prevents stack traces from leaking to the client in production
 *
 * Future expansion:
 * - Log errors to an external service (Sentry, LogRocket)
 * - Add request ID to error responses for traceability
 * - Handle Prisma-specific errors (P2002 unique constraint, etc.)
 * - Handle Zod validation errors with field-level detail
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
      type: err.type,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Unknown error — log and return generic 500
  console.error("[ErrorHandler] Unhandled error:", err);

  res.status(500).json({
    type: "server",
    message: "Internal server error",
  });
};
