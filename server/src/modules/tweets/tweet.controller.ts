/**
 * Tweet controller — HTTP request handling for tweet endpoints.
 *
 * Purpose:
 * - getFeed: parse query params → call service → return paginated tweets
 * - getById: parse :id → call service → return single tweet
 * - create: parse body + userId → call service → return 201
 * - update: parse :id + body + userId → call service → return updated tweet
 * - delete: parse :id + userId → call service → return 204
 * - toggleLike: parse :id + userId → call service → return like state
 *
 * Response format: All responses use sendSuccess() → { success: true, data, meta? }
 *
 * Principle: SRP — only parses requests and sends responses, no business logic.
 * Principle: DIP — depends on ITweetService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { createTweetService } from "./tweet.service.js";
import type { ITweetService } from "./tweet.types.js";
import { sendSuccess } from "../../shared/response/index.js";
import { parseId } from "../../shared/utils/index.js";

// ─── Controller Factory ──────────────────────────────────────────────────────

/**
 * Creates tweet controller handlers with injected service dependency.
 *
 * @param service - Tweet service instance (defaults to production service)
 */
export const createTweetController = (
  service: ITweetService = createTweetService(),
) => ({

  /**
   * GET /tweets
   * Returns cursor-paginated feed. Uses optionalAuth for isLiked.
   */
  getFeed: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit } = req.query as unknown as { cursor?: number; limit: number };
      const result = await service.getFeed({ cursor, limit }, req.userId);

      sendSuccess(res, result.data, 200, { ...result.meta });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /tweets/:id
   * Returns a single tweet. Uses optionalAuth for isLiked.
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id, "Tweet ID");
      const tweet = await service.getById(id, req.userId);

      sendSuccess(res, tweet);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /tweets
   * Creates a new tweet. Requires authGuard (userId guaranteed).
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweet = await service.create(req.userId!, req.body.body);

      sendSuccess(res, tweet, 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /tweets/:id
   * Edits own tweet. Requires authGuard (userId guaranteed).
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id, "Tweet ID");
      const tweet = await service.update(id, req.userId!, req.body);

      sendSuccess(res, tweet);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /tweets/:id
   * Deletes own tweet. Requires authGuard (userId guaranteed).
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id, "Tweet ID");
      await service.delete(id, req.userId!);

      sendSuccess(res, null, 204);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /tweets/:id/like
   * Toggles like on a tweet. Requires authGuard (userId guaranteed).
   */
  toggleLike: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = parseId(req.params.id, "Tweet ID");
      const result = await service.toggleLike(req.userId!, tweetId);

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
});
