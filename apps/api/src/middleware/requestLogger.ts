/**
 * Request logger middleware.
 *
 * Current purpose:
 * - Logs every incoming request: method, path, status code, and duration in ms
 * - Helps debug slow endpoints and track traffic patterns during development
 *
 * Future expansion:
 * - Add request ID (X-Request-ID header) for distributed tracing
 * - Log request body (sanitized — exclude passwords) in debug mode
 * - Write to a structured logging service (Winston, Pino) instead of console
 * - Add color coding by status code range (2xx green, 4xx yellow, 5xx red)
 */

import type { Request, Response, NextFunction } from "express";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[${req.method}] ${req.path} → ${status} (${duration}ms)`);
  });

  next();
};
