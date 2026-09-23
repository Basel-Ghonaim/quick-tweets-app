/**
 * Comment service — business logic for comments.
 *
 * Purpose:
 * - getThread(): verify tweet exists → cursor page of top-level comments → DTO map
 * - getReplies(): verify parent exists → cursor page of its replies → DTO map
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
import { avatarReferencesOf, toAuthorEmbed } from "../../shared/utils/index.js";
import { createCommentRepository } from "./comment.repository.js";
import type {
  ICommentRepository,
  ICommentService,
  CommentResponse,
  CommentUpdate,
  CommentWithRelations,
  CursorParams,
  CursorMeta,
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
 * Transforms a raw DB comment into the frontend DTO. The caller supplies the
 * resolved tokens, so the mapper stays pure and Media owns identity.
 */
const toCommentResponse = (
  comment: CommentWithRelations,
  tokens: ReadonlyMap<number, string>,
): CommentResponse => {
  const token = comment.mediaId === null ? undefined : tokens.get(comment.mediaId);
  return {
    id: comment.id,
    body: comment.body,
    media: token === undefined ? null : { token },
    author: toAuthorEmbed(comment.author, tokens),
    tweetId: comment.tweetId,
    parentId: comment.parentId,
    // Top-level only: a reply cannot be answered, so its tally would always be
    // zero and would invite a client to render a control that does nothing.
    ...(comment.parentId === null ? { repliesCount: comment._count.replies } : {}),
    createdAt: comment.createdAt,
  };
};

/**
 * Resolve every media and avatar reference on a page of comments in **one** query,
 * then map. Resolving per comment would be an N+1 over a page. An unresolvable
 * media reference is surfaced as `null` — Media resolves only servable objects,
 * so a referenced-but-unservable attachment is a divergence, logged.
 */
const toResponses = async (
  media: CommentMediaPort,
  comments: CommentWithRelations[],
): Promise<CommentResponse[]> => {
  const referenceIds = comments
    .map((comment) => comment.mediaId)
    .filter((id): id is number => id !== null);
  const tokens = await media.resolution.resolveTokens([
    ...referenceIds,
    ...avatarReferencesOf(comments.map((comment) => comment.author)),
  ]);
  return comments.map((comment) => {
    if (comment.mediaId !== null && !tokens.has(comment.mediaId)) {
      console.error("[comments] a referenced media object did not resolve (divergence)", {
        commentId: comment.id,
        mediaId: comment.mediaId,
      });
    }
    return toCommentResponse(comment, tokens);
  });
};

/**
 * One comment, resolved through the same batched path. A token the attach already
 * returned is kept, so only the author's avatar is asked for.
 */
const toResponse = async (
  media: CommentMediaPort,
  comment: CommentWithRelations,
  attachedToken: string | null = null,
): Promise<CommentResponse> => {
  if (attachedToken === null || comment.mediaId === null) {
    return (await toResponses(media, [comment]))[0]!;
  }
  const tokens = new Map<number, string>(
    await media.resolution.resolveTokens(avatarReferencesOf([comment.author])),
  );
  tokens.set(comment.mediaId, attachedToken);
  return toCommentResponse(comment, tokens);
};

/**
 * Turns an n+1 fetch into a page: the extra row is the answer to `hasMore` and
 * is dropped, and the cursor is the last id actually returned.
 */
const sliceToPage = async (
  media: CommentMediaPort,
  fetched: CommentWithRelations[],
  limit: number,
): Promise<{ data: CommentResponse[]; meta: CursorMeta }> => {
  const hasMore = fetched.length > limit;
  const rows = hasMore ? fetched.slice(0, limit) : fetched;
  const last = rows[rows.length - 1];

  return {
    data: await toResponses(media, rows),
    meta: {
      nextCursor: hasMore && last ? String(last.id) : null,
      limit,
      hasMore,
    },
  };
};

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
  // ─── The Thread: top-level comments (cursor-paginated) ──────────────

  getThread: async (
    tweetId: number,
    params: CursorParams,
  ): Promise<{ data: CommentResponse[]; meta: CursorMeta }> => {
    const tweetFound = await repo.tweetExists(tweetId);
    if (!tweetFound) {
      throw AppError.notFound("Tweet");
    }

    return sliceToPage(media, await repo.findThread(tweetId, params), params.limit);
  },

  // ─── List Replies (cursor-paginated) ────────────────────────────────

  getReplies: async (
    parentId: number,
    params: CursorParams,
  ): Promise<{ data: CommentResponse[]; meta: CursorMeta }> => {
    const parent = await repo.findParent(parentId);
    if (parent === null) {
      throw AppError.notFound("Comment");
    }

    return sliceToPage(media, await repo.findReplies(parentId, params), params.limit);
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
      return toResponse(media, await repo.create(authorId, tweetId, body));
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
      return toResponse(media, comment, token);
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

    // 3a. Body-only edit (media omitted) — media untouched, no transaction. The
    //     existing reference is resolved for the response.
    if (data.media === undefined) {
      return toResponse(media, await repo.update(commentId, { body: data.body }));
    }

    // 3b. Media edit (set / replace / remove) — coordinate in one transaction.
    //     Captured in a const so its narrowed type survives inside the closure.
    const mediaEdit = data.media;
    const oldMediaId = owner.mediaId;
    const referrer = commentReferrer(commentId);
    try {
      const { updated, token } = await runInTransaction(async (tx) => {
        let newMediaId: number | null = null;
        let token: string | null = null;
        if (mediaEdit !== null) {
          const attached = await media.ownership.authorizeAttach(
            { token: mediaEdit.token, ownerId: userId },
            tx,
          );
          newMediaId = attached.referenceId;
          token = attached.token;
        }

        // Signal only a genuine change (single-ref set difference): a resubmit of
        // the same object neither ends nor re-begins.
        if (oldMediaId !== newMediaId) {
          if (oldMediaId !== null) {
            await media.references.referenceEnded({ mediaId: oldMediaId, referrer }, tx);
          }
          if (newMediaId !== null) {
            await media.references.referenceBegan({ mediaId: newMediaId, referrer }, tx);
          }
        }

        const updated = await repo.update(commentId, { body: data.body, mediaId: newMediaId }, tx);
        return { updated, token };
      });
      return toResponse(media, updated, token);
    } catch (err) {
      throw asAttachFailure(err);
    }
  },

  // ─── Delete Comment (ownership check) ───────────────────────

  delete: async (
    commentId: number,
    userId: number,
  ): Promise<void> => {
    // 1. Lightweight ownership check — authorId (+ current media reference)
    const owner = await repo.findOwner(commentId);
    if (!owner) {
      throw AppError.notFound("Comment");
    }

    // 2. Check ownership — only the author can delete
    if (owner.authorId !== userId) {
      throw AppError.forbidden("You can only delete your own comments");
    }

    // 3. No media — a plain delete.
    const mediaId = owner.mediaId;
    if (mediaId === null) {
      await repo.delete(commentId);
      return;
    }

    // 4. With media — end the reference and delete the row together.
    await runInTransaction(async (tx) => {
      await media.references.referenceEnded(
        { mediaId, referrer: commentReferrer(commentId) },
        tx,
      );
      await repo.delete(commentId, tx);
    });
  },

  // ─── Delete every comment on a tweet (dependent-deletion primitive) ──
  //
  // Called by the tweet-deletion use-case inside its transaction: end each
  // comment's media reference (comments own the comment:{id} tag), then bulk
  // delete the rows. No ownership check here — the use-case authorizes the
  // tweet deletion; the comments are the tweet's dependents.

  deleteForTweet: async (tweetId, client) => {
    const withMedia = await repo.findMediaRefsByTweet(tweetId, client);
    for (const { id, mediaId } of withMedia) {
      await media.references.referenceEnded(
        { mediaId, referrer: commentReferrer(id) },
        client,
      );
    }
    await repo.deleteByTweet(tweetId, client);
  },
});
