/**
 * Comment controller — HTTP request handling for comment endpoints.
 *
 * Purpose:
 * - getComments: parse tweetId + query → call service → return offset-paginated comments
 * - create: parse tweetId + body + userId → call service → return 201
 * - update: parse tweetId + commentId + body + userId → call service → return updated
 * - delete: parse tweetId + commentId + userId → call service → return 204
 *
 * All handlers receive tweetId via req.params.tweetId (from mergeParams).
 *
 * Response format: All responses use sendSuccess() → { success: true, data, meta? }
 *
 * Principle: SRP — only parses requests and sends responses, no business logic.
 * Principle: DIP — depends on ICommentService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { createCommentService } from "./comment.service.js";
import type { ICommentService } from "./comment.types.js";
import { sendSuccess } from "../../shared/response/index.js";

// ─── Controller Factory ──────────────────────────────────────────────────────

/**
 * Creates comment controller handlers with injected service dependency.
 *
 * @param service - Comment service instance (defaults to production service)
 */
export const createCommentController = (
  service: ICommentService = createCommentService(),
) => ({

  /**
   * GET /tweets/:tweetId/comments
   * Returns offset-paginated comments for a tweet. No auth required.
   */
  getComments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = Number(req.params.tweetId);
      const { page, limit } = req.query as unknown as { page: number; limit: number };

      const result = await service.getComments(tweetId, { page, limit });

      sendSuccess(res, result.data, 200, { ...result.meta });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /tweets/:tweetId/comments
   * Adds a comment to a tweet. Requires authGuard (userId guaranteed).
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = Number(req.params.tweetId);
      const comment = await service.create(req.userId!, tweetId, req.body.body);

      sendSuccess(res, comment, 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /tweets/:tweetId/comments/:commentId
   * Edits own comment. Requires authGuard (userId guaranteed).
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = Number(req.params.tweetId);
      const commentId = Number(req.params.commentId);

      const comment = await service.update(commentId, tweetId, req.userId!, req.body);

      sendSuccess(res, comment);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /tweets/:tweetId/comments/:commentId
   * Deletes own comment. Requires authGuard (userId guaranteed).
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = Number(req.params.tweetId);
      const commentId = Number(req.params.commentId);

      await service.delete(commentId, tweetId, req.userId!);

      sendSuccess(res, null, 204);
    } catch (err) {
      next(err);
    }
  },
});
