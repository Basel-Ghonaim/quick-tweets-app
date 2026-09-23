/**
 * Comment controller — HTTP request handling for comment endpoints.
 *
 * Purpose:
 * - list: parse the query → the tweet's thread or one comment's replies, cursor-paginated
 * - setLike / clearLike: parse :id + userId → call service → return like state
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
   * GET /comments?tweetId=1  → the tweet's top-level comments
   * GET /comments?parentId=8 → that comment's replies
   *
   * The validator has already guaranteed exactly one of the two is present, so
   * the branch here is a routing choice, not a second validation.
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tweetId, parentId, cursor, limit } = req.query as unknown as {
        tweetId?: number;
        parentId?: number;
        cursor?: number;
        limit: number;
      };

      // optionalAuth: a reader if signed in, undefined for a guest. It decides
      // `isLiked` and nothing else — a guest still sees the whole thread.
      const result =
        parentId === undefined
          ? await service.getThread(tweetId!, { cursor, limit }, req.userId)
          : await service.getReplies(parentId, { cursor, limit }, req.userId);

      sendSuccess(res, result.data, 200, { ...result.meta });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /comments
   * Adds a comment to a tweet, or a reply when `parentId` is given.
   * Requires authGuard (userId guaranteed).
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tweetId = parseId(req.body.tweetId as string, "Tweet ID");
      const comment = await service.create(
        req.userId!,
        tweetId,
        req.body.body,
        req.body.media?.token,
        req.body.parentId,
      );

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
  /**
   * PUT /comments/:id/like
   * Sets the reader's like. Idempotent. Requires authGuard (userId guaranteed).
   */
  setLike: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const commentId = parseId(req.params.id, "Comment ID");
      sendSuccess(res, await service.setLike(req.userId!, commentId));
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /comments/:id/like
   * Clears the reader's like. Idempotent.
   */
  clearLike: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const commentId = parseId(req.params.id, "Comment ID");
      sendSuccess(res, await service.clearLike(req.userId!, commentId));
    } catch (err) {
      next(err);
    }
  },
});