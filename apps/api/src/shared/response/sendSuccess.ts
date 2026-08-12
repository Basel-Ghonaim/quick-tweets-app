/**
 * Response helpers — standardized API response format.
 *
 * Purpose:
 * - Enforces a consistent response shape across ALL controllers
 * - Frontend always receives: { success: true/false, data?, meta?, error? }
 * - Eliminates ad-hoc `res.json({ user })` calls
 *
 * Usage in controllers:
 *   sendSuccess(res, { user }, 201);
 *   sendSuccess(res, tweets, 200, { cursor, limit, hasMore });
 *   sendSuccess(res, null, 204);
 *
 * Principle: DRY — one place controls the response shape.
 * Principle: Consistency — the frontend can rely on a single contract.
 */

import type { Response } from "express";

/**
 * Sends a standardized success response.
 *
 * @param res - Express response object
 * @param data - Response payload (object, array, or null for 204)
 * @param statusCode - HTTP status code (default: 200)
 * @param meta - Optional metadata (pagination, counts, etc.)
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: Record<string, unknown>,
): void => {
  // 204 No Content — no body
  if (statusCode === 204) {
    res.status(204).send();
    return;
  }

  const response: { success: true; data: T; meta?: Record<string, unknown> } = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
};
