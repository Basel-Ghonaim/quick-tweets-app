/**
 * Tweet controller — HTTP request handling for tweet endpoints.
 *
 * Purpose:
 * - getFeed: parse query params → call service (feed, an author's posts, or a search) → return paginated tweets
 * - getById: parse :id → call service → return single tweet
 * - create: parse body + userId → call service → return 201
 * - update: parse :id + body + userId → call service → return updated tweet
 * - delete: parse :id + userId → call service → return 204
 * - setLike / clearLike: parse :id + userId → call service → return like state
 *
 * Response format: All responses use sendSuccess() → { success: true, data, meta? }
 *
 * Principle: SRP — only parses requests and sends responses, no business logic.
 * Principle: DIP — depends on ITweetService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { createTweetService } from "./tweet.service.js";
import type { ITweetService } from "./tweet.types.js";
import { createDeleteTweet, type DeleteTweet } from "../../application/deleteTweet.js";
import { sendSuccess } from "../../shared/response/index.js";
import { parseId } from "../../shared/utils/index.js";

// ─── Controller Factory ──────────────────────────────────────────────────────

/**
 * Creates tweet controller handlers with injected dependencies.
 *
 * @param service - Tweet service instance (defaults to production service)
 * @param deleteTweet - The cross-aggregate tweet-deletion use-case (deletes a
 *   tweet and its dependent comments, coordinating media references). Injected
 *   so the composition — not the Tweets feature — owns the cross-feature wiring.
 */
export const createTweetController = (
  service: ITweetService = createTweetService(),
  deleteTweet: DeleteTweet = createDeleteTweet(),
) => ({

  /**
   * GET /tweets
   * Returns cursor-paginated feed. Optional ?author=username filters by author.
   * Uses optionalAuth for isLiked.
   */
  getFeed: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit, author, q } = req.query as unknown as { cursor?: number; limit: number; author?: string; q?: string };

      const result =
        q !== undefined
          ? await service.search(q, { cursor, limit }, req.userId)
          : author
            ? await service.getByAuthorUsername(author, { cursor, limit }, req.userId)
            : await service.getFeed({ cursor, limit }, req.userId);

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
      const tweet = await service.create(req.userId!, req.body.body, req.body.media);

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
      await deleteTweet(id, req.userId!);

      sendSuccess(res, null, 204);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /tweets/:id/like
   * Sets the reader's like. Idempotent — liking twice is not an error, and does
   * not undo. Requires authGuard (userId guaranteed).
   */
  setLike: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = parseId(req.params.id, "Tweet ID");
      sendSuccess(res, await service.setLike(req.userId!, tweetId));
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /tweets/:id/like
   * Clears the reader's like. Idempotent — unliking something not liked answers
   * the same state rather than a refusal.
   */
  clearLike: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = parseId(req.params.id, "Tweet ID");
      sendSuccess(res, await service.clearLike(req.userId!, tweetId));
    } catch (err) {
      next(err);
    }
  },
});
