/**
 * Comment controller — HTTP request handling for comment endpoints.
 *
 * Purpose:
 * - getComments: parse tweetId from query → call service → return offset-paginated comments
 * - create: parse tweetId from body + userId → call service → return 201
 * - update: parse commentId + body + userId → call service → return updated
 * - delete: parse commentId + userId → call service → return 204
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
import { parseId } from "../../shared/utils/index.js";

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
   * GET /comments?tweetId=1
   * Returns offset-paginated comments for a tweet. No auth required.
   */
  getComments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = parseId(req.query.tweetId as string, "Tweet ID");
      const { page, limit } = req.query as unknown as { page: number; limit: number };

      const result = await service.getComments(tweetId, { page, limit });

      sendSuccess(res, result.data, 200, { ...result.meta });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /comments
   * Adds a comment to a tweet. Requires authGuard (userId guaranteed).
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = parseId(req.body.tweetId as string, "Tweet ID");
      const comment = await service.create(req.userId!, tweetId, req.body.body, req.body.media?.token);

      sendSuccess(res, comment, 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /comments/:id
   * Edits own comment. Requires authGuard (userId guaranteed).
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const commentId = parseId(req.params.id, "Comment ID");

      const comment = await service.update(commentId, req.userId!, req.body);

      sendSuccess(res, comment);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /comments/:id
   * Deletes own comment. Requires authGuard (userId guaranteed).
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const commentId = parseId(req.params.id, "Comment ID");

      await service.delete(commentId, req.userId!);

      sendSuccess(res, null, 204);
    } catch (err) {
      next(err);
    }
  },
});
