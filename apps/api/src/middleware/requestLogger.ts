/**
 * Request logger middleware.
 *
 * Purpose:
 * - Logs every incoming request: method, path, status code, and duration in ms
 * - Helps debug slow endpoints and track traffic patterns during development
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
