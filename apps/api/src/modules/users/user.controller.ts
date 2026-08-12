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
import { AppError } from "../../shared/errors/index.js";
import { resolveUserByHandle, type ResolvedHandle } from "../../shared/identity/index.js";

// ─── Controller Factory ──────────────────────────────────────────────────────

/**
 * Creates user controller handlers with injected service dependency.
 *
 * @param service - User service instance (defaults to production service)
 */
export const createUserController = (
  service: IUserService = createUserService(),
  resolveHandle: (handle: string) => Promise<ResolvedHandle | null> = resolveUserByHandle,
) => ({

  /**
   * GET /users/:username
   * Returns user profile with counts + isFollowing. Uses optionalAuth.
   *
   * A former handle (released on a rename) 301-redirects to the canonical
   * current-username URL, so historical profile links never 404.
   */
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const handle = String(req.params.username);
      const resolved = await resolveHandle(handle);
      if (!resolved) throw AppError.notFound("User");
      if (resolved.viaAlias) {
        res.redirect(301, `${req.baseUrl}/${resolved.canonicalUsername}`);
        return;
      }

      const profile = await service.getProfile(handle, req.userId);
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
