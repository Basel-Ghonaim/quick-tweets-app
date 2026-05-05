/**
 * Auth guard middleware — JWT verification for protected routes.
 *
 * Current purpose:
 * - Extracts Bearer token from the Authorization header
 * - Verifies the JWT using verifyAccessToken
 * - Attaches the decoded userId to the request object
 * - Rejects unauthenticated requests with 401
 *
 * Future expansion:
 * - Add role-based authorization (e.g., admin-only routes)
 * - Add optional auth (some routes work with or without token)
 *
 * Principle: SRP — only checks authentication, no business logic.
 * Principle: Middleware Pattern — cross-cutting concern handled in one place.
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../shared/utils/index.js";
import { AppError } from "../shared/errors/index.js";

/**
 * Extends Express Request to include the authenticated user's ID.
 * Available in controllers after authGuard runs.
 */
export interface AuthenticatedRequest extends Request {
  userId: number;
}

/**
 * Middleware that protects routes by requiring a valid JWT.
 *
 * Usage in routes:
 *   router.get("/me", authGuard, controller.me);
 *
 * After this middleware, the controller can access:
 *   (req as AuthenticatedRequest).userId
 */
export const authGuard = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // Check for Authorization header presence
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw AppError.authentication("Missing or invalid authorization header");
  }

  // Extract token: "Bearer eyJhbGciOi..." → "eyJhbGciOi..."
  const token = authHeader.split(" ")[1];

  // Verify and decode — throws AppError.authentication on failure
  const payload = verifyAccessToken(token);

  // Attach userId to request for downstream controllers
  (req as AuthenticatedRequest).userId = payload.userId;

  next();
};
