/**
 * User controller — HTTP request handling for user endpoints.
 *
 * Purpose:
 * - getProfile: parse :username + optionalAuth → call service → return profile
 *
 * Response format: All responses use sendSuccess() → { success: true, data, meta? }
 *
 * Principle: SRP — only parses requests and sends responses, no business logic.
 * Principle: DIP — depends on IUserService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { createUserService } from "./user.service.js";
import type { IUserService } from "./user.types.js";
import { sendSuccess } from "../../shared/response/index.js";

// ─── Controller Factory ──────────────────────────────────────────────────────

/**
 * Creates user controller handlers with injected service dependency.
 *
 * @param service - User service instance (defaults to production service)
 */
export const createUserController = (
  service: IUserService = createUserService(),
) => ({

  /**
   * GET /users/:username
   * Returns user profile with counts + isFollowing. Uses optionalAuth.
   */
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = String(req.params.username);
      const profile = await service.getProfile(username, req.userId);

      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /users/me
   * The authenticated user's own profile (incl. resolved avatar). Requires authGuard.
   */
  getMe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await service.getMe(req.userId!);

      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /users/me
   * Updates own name / bio / avatar (atomic). Requires authGuard.
   */
  updateMe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await service.updateMe(req.userId!, req.body);

      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  },
});
