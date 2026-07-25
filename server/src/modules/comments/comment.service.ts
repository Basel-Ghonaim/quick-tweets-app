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
 *   2. Is the user the author of this comment?
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on ICommentRepository interface, not Prisma.
 * Principle: Factory Pattern — createCommentService(repo?) for DI and testability.
 */

import { AppError } from "../../shared/errors/index.js";
import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import {
  mediaOwnership,
  mediaReferences,
  mediaResolution,
  MediaAttachError,
  type IMediaOwnership,
  type IMediaReferences,
  type IMediaResolution,
} from "../media/index.js";
import { createCommentRepository } from "./comment.repository.js";
import type {
  ICommentRepository,
  ICommentService,
  CommentResponse,
  CommentUpdate,
  CommentWithRelations,
  OffsetParams,
  OffsetMeta,
} from "./comment.types.js";

// ─── Media port ──────────────────────────────────────────────────────────────

/** The Media surfaces comments consume, grouped into one injected dependency. */
export interface CommentMediaPort {
  ownership: IMediaOwnership;
  references: IMediaReferences;
  resolution: IMediaResolution;
}

const defaultMediaPort: CommentMediaPort = {
  ownership: mediaOwnership,
  references: mediaReferences,
  resolution: mediaResolution,
};

/**
 * The referrer tag under which a comment holds its media reference. Derived from
 * the immutable comment id, so an end signal always matches its begin.
 */
const commentReferrer = (commentId: number): string => `comment:${commentId}`;

/** Media that could not be attached is a request problem, not a server fault. */
const asAttachFailure = (err: unknown): unknown =>
  err instanceof MediaAttachError
    ? AppError.validation("Comment could not be saved", {
        media: ["The media could not be attached; please re-upload and try again"],
      })
    : err;

// ─── DTO Transformer ─────────────────────────────────────────────────────────

/**
 * Transforms a raw DB comment into the frontend DTO. `token` is the resolved
 * public read token for the comment's media (or `null`) — supplied by the
 * caller, so the mapper stays pure and Media owns identity.
 */
const toCommentResponse = (
  comment: CommentWithRelations,
  token: string | null = null,
): CommentResponse => ({
  id: comment.id,
  body: comment.body,
  media: token !== null ? { token } : null,
  author: comment.author,
  tweetId: comment.tweetId,
  createdAt: comment.createdAt,
});

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an ICommentService with injected dependencies.
 *
 * @param repo - Comment database operations (defaults to Prisma implementation)
 * @param media - The Media surfaces comments consume (defaults to the published ones)
 * @param runInTransaction - Interactive-transaction runner (defaults to Prisma's;
 *   injectable so media coordination is testable without a live database)
 */
export const createCommentService = (
  repo: ICommentRepository = createCommentRepository(),
  media: CommentMediaPort = defaultMediaPort,
  runInTransaction: RunInTransaction = defaultRunInTransaction,
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
      // Media tokens are resolved and surfaced on read in a later step; until
      // then the mapper emits `media: null`.
      data: comments.map((comment) => toCommentResponse(comment)),
      meta,
    };
  },

  // ─── Create Comment ─────────────────────────────────────────────────

  create: async (
    authorId: number,
    tweetId: number,
    body: string,
    mediaToken?: string,
  ): Promise<CommentResponse> => {
    // 1. Verify tweet exists
    const tweetFound = await repo.tweetExists(tweetId);
    if (!tweetFound) {
      throw AppError.notFound("Tweet");
    }

    // 2a. No media — the plain path, no transaction.
    if (mediaToken === undefined) {
      return toCommentResponse(await repo.create(authorId, tweetId, body));
    }

    // 2b. With media — the comment, its reference, and Media's record of that
    //     reference all commit together, or not at all.
    try {
      const { comment, token } = await runInTransaction(async (tx) => {
        const { referenceId, token } = await media.ownership.authorizeAttach(
          { token: mediaToken, ownerId: authorId },
          tx,
        );
        const created = await repo.create(authorId, tweetId, body, referenceId, tx);
        await media.references.referenceBegan(
          { mediaId: referenceId, referrer: commentReferrer(created.id) },
          tx,
        );
        return { comment: created, token };
      });
      return toCommentResponse(comment, token);
    } catch (err) {
      throw asAttachFailure(err);
    }
  },

  // ─── Update Comment (double ownership check) ───────────────────────

  update: async (
    commentId: number,
    userId: number,
    data: CommentUpdate,
  ): Promise<CommentResponse> => {
    // 1. Lightweight ownership check — authorId (+ current media reference)
    const owner = await repo.findOwner(commentId);
    if (!owner) {
      throw AppError.notFound("Comment");
    }

    // 2. Check ownership — only the author can edit
    if (owner.authorId !== userId) {
      throw AppError.forbidden("You can only edit your own comments");
    }

    // 3. Media edits are coordinated in a later step; for now only the body edits.
    const updated = await repo.update(commentId, { body: data.body });
    return toCommentResponse(updated);
  },

  // ─── Delete Comment (ownership check) ───────────────────────

  delete: async (
    commentId: number,
    userId: number,
  ): Promise<void> => {
    // 1. Lightweight ownership check — only fetch authorId
    const owner = await repo.findOwner(commentId);
    if (!owner) {
      throw AppError.notFound("Comment");
    }

    // 2. Check ownership — only the author can delete
    if (owner.authorId !== userId) {
      throw AppError.forbidden("You can only delete your own comments");
    }

    // 4. Delete
    await repo.delete(commentId);
  },
});
