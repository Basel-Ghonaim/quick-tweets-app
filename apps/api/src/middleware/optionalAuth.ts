/**
 * Optional auth middleware — soft token verification for public endpoints.
 *
 * Purpose:
 * - Checks for a Bearer token in the Authorization header
 * - If present and valid: attaches userId to request
 * - If absent, malformed, or invalid: continues silently (userId = undefined)
 * - NEVER returns 401 — always calls next()
 *
 * Used on endpoints that work for both guests and logged-in users:
 *   GET /tweets         → guest sees feed, logged-in sees isLiked
 *   GET /tweets/:id     → same
 *   GET /users/:username/tweets → same
 *
 * Performance:
 *   Includes a fast JWT format check (3-part structure) to skip
 *   the CPU-heavy jwt.verify() call for obviously invalid tokens.
 *
 * Compared to authGuard:
 *   authGuard    → STRICT: 401 if no valid token. userId is guaranteed.
 *   optionalAuth → SOFT:   never rejects. userId may be undefined.
 *
 * Principle: SRP — only enriches the request, no business logic.
 * Principle: Fail-Safe — unknown state defaults to guest (least privilege).
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../shared/utils/index.js";

/**
 * Middleware that optionally attaches userId to the request.
 *
 * Usage in routes:
 *   router.get("/tweets", optionalAuth, controller.getFeed);
 *
 * After this middleware, controllers access:
 *   req.userId  → number (if valid token) or undefined (guest)
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  // No header → continue as guest
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  // Fast format check: valid JWTs have exactly 3 dot-separated parts
  // Skip jwt.verify() for obviously malformed tokens (saves CPU)
  if (!token || token.split(".").length !== 3) {
    return next();
  }

  try {
    // Verify and decode — same function used by authGuard
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
  } catch {
    // Token is invalid or expired — continue as guest
    // This is expected behavior, not an error
  }

  next();
};
