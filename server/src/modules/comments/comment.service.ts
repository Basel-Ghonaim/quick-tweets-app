/**
 * Comment service — business logic for comments.
 *
 * Purpose:
 * - getComments(): verify tweet exists → offset pagination math → DTO map
 * - create(): verify tweet exists → create → DTO
 * - update(): double ownership (comment exists + belongs to tweet + user is author)
 * - delete(): double ownership → delete
 *
 * Double ownership validation:
 *   1. Does the comment exist?
 *   2. Does the comment belong to the specified tweet? (prevents URL manipulation)
 *   3. Is the user the author of this comment?
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on ICommentRepository interface, not Prisma.
 * Principle: Factory Pattern — createCommentService(repo?) for DI and testability.
 */

import { AppError } from "../../shared/errors/index.js";
import { createCommentRepository } from "./comment.repository.js";
import type {
  ICommentRepository,
  ICommentService,
  CommentResponse,
  CommentWithRelations,
  OffsetParams,
  OffsetMeta,
} from "./comment.types.js";

// ─── DTO Transformer ─────────────────────────────────────────────────────────

/** Transforms a raw DB comment (with relations) into the frontend DTO. */
const toCommentResponse = (comment: CommentWithRelations): CommentResponse => ({
  id: comment.id,
  body: comment.body,
  author: comment.author,
  tweetId: comment.tweetId,
  createdAt: comment.createdAt,
});

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an ICommentService with injected repository dependency.
 *
 * @param repo - Comment database operations (defaults to Prisma implementation)
 */
export const createCommentService = (
  repo: ICommentRepository = createCommentRepository(),
): ICommentService => ({
  // ─── List Comments (offset-paginated) ───────────────────────────────

  getComments: async (
    tweetId: number,
    params: OffsetParams,
  ): Promise<{ data: CommentResponse[]; meta: OffsetMeta }> => {
    // 1. Verify tweet exists
    const tweetFound = await repo.tweetExists(tweetId);
    if (!tweetFound) {
      throw AppError.notFound("Tweet");
    }

    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // 2. Run count + findMany in parallel
    const [totalRecords, comments] = await Promise.all([
      repo.count(tweetId),
      repo.findMany(tweetId, skip, limit),
    ]);

    // 3. Compute pagination math
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const meta: OffsetMeta = {
      currentPage: page,
      limit,
      totalPages,
      totalRecords,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      data: comments.map(toCommentResponse),
      meta,
    };
  },

  // ─── Create Comment ─────────────────────────────────────────────────

  create: async (
    authorId: number,
    tweetId: number,
    body: string,
  ): Promise<CommentResponse> => {
    // 1. Verify tweet exists
    const tweetFound = await repo.tweetExists(tweetId);
    if (!tweetFound) {
      throw AppError.notFound("Tweet");
    }

    // 2. Create and return as DTO
    const comment = await repo.create(authorId, tweetId, body);
    return toCommentResponse(comment);
  },

  // ─── Update Comment (double ownership check) ───────────────────────

  update: async (
    commentId: number,
    tweetId: number,
    userId: number,
    data: { body?: string },
  ): Promise<CommentResponse> => {
    // 1. Lightweight ownership check — only fetch authorId + tweetId
    const owner = await repo.findOwner(commentId);
    if (!owner) {
      throw AppError.notFound("Comment");
    }

    // 2. Verify comment belongs to the specified tweet (prevents URL manipulation)
    if (owner.tweetId !== tweetId) {
      throw AppError.notFound("Comment");
    }

    // 3. Check ownership — only the author can edit
    if (owner.authorId !== userId) {
      throw AppError.authorization("You can only edit your own comments");
    }

    // 4. Update and return
    const updated = await repo.update(commentId, data);
    return toCommentResponse(updated);
  },

  // ─── Delete Comment (double ownership check) ───────────────────────

  delete: async (
    commentId: number,
    tweetId: number,
    userId: number,
  ): Promise<void> => {
    // 1. Lightweight ownership check — only fetch authorId + tweetId
    const owner = await repo.findOwner(commentId);
    if (!owner) {
      throw AppError.notFound("Comment");
    }

    // 2. Verify comment belongs to the specified tweet
    if (owner.tweetId !== tweetId) {
      throw AppError.notFound("Comment");
    }

    // 3. Check ownership — only the author can delete
    if (owner.authorId !== userId) {
      throw AppError.authorization("You can only delete your own comments");
    }

    // 4. Delete
    await repo.delete(commentId);
  },
});
