/**
 * Follow controller — HTTP request handling for follow endpoints.
 *
 * Purpose:
 * - follow: parse :username + userId → call service → return FollowActionResponse
 * - unfollow: parse :username + userId → call service → return FollowActionResponse
 * - getFollowers: parse :username + query → call service → return paginated list
 * - getFollowing: parse :username + query → call service → return paginated list
 *
 * All handlers receive :username via req.params.username (from mergeParams).
 *
 * Response format: All responses use sendSuccess() → { success: true, data, meta? }
 *
 * Principle: SRP — only parses requests and sends responses, no business logic.
 * Principle: DIP — depends on IFollowService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { createFollowService } from "./follow.service.js";
import type { IFollowService } from "./follow.types.js";
import { sendSuccess } from "../../shared/response/index.js";

// ─── Controller Factory ──────────────────────────────────────────────────────

/**
 * Creates follow controller handlers with injected service dependency.
 *
 * @param service - Follow service instance (defaults to production service)
 */
export const createFollowController = (
  service: IFollowService = createFollowService(),
) => ({

  /**
   * POST /users/:username/follow
   * Follow a user. Requires authGuard (userId guaranteed).
   */
  follow: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = String(req.params.username);
      const result = await service.follow(req.userId!, username);

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /users/:username/follow
   * Unfollow a user. Requires authGuard (userId guaranteed).
   */
  unfollow: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = String(req.params.username);
      const result = await service.unfollow(req.userId!, username);

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /users/:username/followers
   * Returns cursor-paginated follower list. No auth required.
   */
  getFollowers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = String(req.params.username);
      const { cursor, limit } = req.query as unknown as { cursor?: number; limit: number };

      const result = await service.getFollowers(username, { cursor, limit });

      sendSuccess(res, result.data, 200, { ...result.meta });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /users/:username/following
   * Returns cursor-paginated following list. No auth required.
   */
  getFollowing: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = String(req.params.username);
      const { cursor, limit } = req.query as unknown as { cursor?: number; limit: number };

      const result = await service.getFollowing(username, { cursor, limit });

      sendSuccess(res, result.data, 200, { ...result.meta });
    } catch (err) {
      next(err);
    }
  },
});
