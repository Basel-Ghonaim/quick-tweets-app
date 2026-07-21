/**
 * Tweet service — business logic for tweets.
 *
 * Purpose:
 * - getFeed(): cursor pagination with n+1 slice, DTO transformation
 * - getById(): single tweet lookup with 404 handling
 * - create(): create tweet and return as DTO
 * - update(): ownership check → update → return as DTO
 * - delete(): ownership check → delete
 * - toggleLike(): check existing → create or delete → return new state
 *
 * Principle: SRP — only business rules, no HTTP or database concerns.
 * Principle: DIP — depends on ITweetRepository interface, not Prisma.
 * Principle: Factory Pattern — createTweetService(repo?) for DI and testability.
 */

import { AppError } from "../../shared/errors/index.js";
import {
  runInTransaction as defaultRunInTransaction,
  type DbClient,
  type RunInTransaction,
} from "../../shared/database/index.js";
import {
  mediaOwnership,
  mediaReferences,
  MediaAttachError,
  type IMediaOwnership,
  type IMediaReferences,
} from "../media/index.js";
import { createTweetRepository } from "./tweet.repository.js";
import type {
  ITweetRepository,
  ITweetService,
  TweetMediaRef,
  TweetResponse,
} from "./tweet.types.js";
import type { CursorParams, CursorMeta } from "../../shared/types/index.js";
import { isPrismaError } from "../../shared/utils/index.js";
import { toTweetResponse } from "./tweet.mapper.js";

// ─── Media port ──────────────────────────────────────────────────────────────

/** The Media surfaces tweets consume, grouped into one injected dependency. */
export interface TweetMediaPort {
  ownership: IMediaOwnership;
  references: IMediaReferences;
}

const defaultMediaPort: TweetMediaPort = {
  ownership: mediaOwnership,
  references: mediaReferences,
};

/**
 * The referrer tag under which a tweet holds its media references. Derived from
 * the immutable tweet id, so an end signal always matches its begin. Several
 * objects on one tweet share the tag — the ledger keys on (object, referrer),
 * and the same object cannot appear twice on one tweet.
 */
const tweetReferrer = (tweetId: number): string => `tweet:${tweetId}`;

/**
 * Authorize each submitted token against the author and turn it into an ordered
 * internal reference. Array order becomes position. Any refusal throws, rolling
 * back the caller's transaction — an attach is all-or-nothing.
 */
const authorizeRefs = async (
  media: TweetMediaPort,
  tokens: string[],
  authorId: number,
  tx: DbClient,
): Promise<TweetMediaRef[]> => {
  const refs: TweetMediaRef[] = [];
  for (const [position, token] of tokens.entries()) {
    const { referenceId } = await media.ownership.authorizeAttach(
      { token, ownerId: authorId },
      tx,
    );
    refs.push({ mediaId: referenceId, position });
  }
  return refs;
};

/** Media that could not be attached is a request problem, not a server fault. */
const asAttachFailure = (err: unknown): unknown =>
  err instanceof MediaAttachError
    ? AppError.validation("Tweet could not be saved", {
        media: ["One or more media items could not be attached; please re-upload and try again"],
      })
    : err;

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an ITweetService with injected dependencies.
 *
 * @param repo - Tweet database operations (defaults to Prisma implementation)
 * @param media - The Media surfaces tweets consume (defaults to the published ones)
 * @param runInTransaction - Interactive-transaction runner (defaults to Prisma's;
 *   injectable so media coordination is testable without a live database)
 */
export const createTweetService = (
  repo: ITweetRepository = createTweetRepository(),
  media: TweetMediaPort = defaultMediaPort,
  runInTransaction: RunInTransaction = defaultRunInTransaction,
): ITweetService => ({
  // ─── Feed (cursor-paginated) ────────────────────────────────────────

  getFeed: async (
    params: CursorParams,
    userId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }> => {
    const { limit } = params;

    // Repository fetches limit+1 items (n+1 trick)
    const tweets = await repo.findMany(params, userId);

    // If we got more than limit, there are more pages
    const hasMore = tweets.length > limit;
    const sliced = hasMore ? tweets.slice(0, limit) : tweets;

    // Build cursor meta
    const lastItem = sliced[sliced.length - 1];
    const meta: CursorMeta = {
      nextCursor: hasMore && lastItem ? String(lastItem.id) : null,
      limit,
      hasMore,
    };

    return {
      data: sliced.map(toTweetResponse),
      meta,
    };
  },

  // ─── Tweets by Author (cursor-paginated) ────────────────────────────

  getByAuthor: async (
    authorId: number,
    params: CursorParams,
    userId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }> => {
    const { limit } = params;

    const tweets = await repo.findByAuthor(authorId, params, userId);

    const hasMore = tweets.length > limit;
    const sliced = hasMore ? tweets.slice(0, limit) : tweets;

    const lastItem = sliced[sliced.length - 1];
    const meta: CursorMeta = {
      nextCursor: hasMore && lastItem ? String(lastItem.id) : null,
      limit,
      hasMore,
    };

    return {
      data: sliced.map(toTweetResponse),
      meta,
    };
  },

  getByAuthorUsername: async (
    username: string,
    params: CursorParams,
    userId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }> => {
    const authorId = await repo.findAuthorIdByUsername(username);
    if (!authorId) {
      throw AppError.notFound("User");
    }

    const { limit } = params;

    const tweets = await repo.findByAuthor(authorId, params, userId);

    const hasMore = tweets.length > limit;
    const sliced = hasMore ? tweets.slice(0, limit) : tweets;

    const lastItem = sliced[sliced.length - 1];
    const meta: CursorMeta = {
      nextCursor: hasMore && lastItem ? String(lastItem.id) : null,
      limit,
      hasMore,
    };

    return {
      data: sliced.map(toTweetResponse),
      meta,
    };
  },

  // ─── Single Tweet ───────────────────────────────────────────────────

  getById: async (id: number, userId?: number): Promise<TweetResponse> => {
    const tweet = await repo.findById(id, userId);

    if (!tweet) {
      throw AppError.notFound("Tweet");
    }

    return toTweetResponse(tweet);
  },

  // ─── Create ─────────────────────────────────────────────────────────

  create: async (
    authorId: number,
    body: string,
    mediaTokens: string[] = [],
  ): Promise<TweetResponse> => {
    if (mediaTokens.length === 0) {
      return toTweetResponse(await repo.create(authorId, body));
    }

    // The tweet, its media rows, and Media's record of those references all
    // commit together or not at all — a half-attached tweet would either show
    // media nothing accounts for, or leak objects nothing will reclaim.
    try {
      const tweet = await runInTransaction(async (tx) => {
        const created = await repo.create(authorId, body, tx);
        const refs = await authorizeRefs(media, mediaTokens, authorId, tx);
        await repo.replaceMediaRefs(created.id, refs, tx);
        for (const ref of refs) {
          await media.references.referenceBegan(
            { mediaId: ref.mediaId, referrer: tweetReferrer(created.id) },
            tx,
          );
        }
        return created;
      });
      return toTweetResponse(tweet);
    } catch (err) {
      throw asAttachFailure(err);
    }
  },

  // ─── Update (ownership check) ───────────────────────────────────────

  update: async (
    id: number,
    userId: number,
    data: { body?: string },
  ): Promise<TweetResponse> => {
    // 1. Lightweight ownership check — only fetch authorId, not full relations
    const owner = await repo.findOwner(id);
    if (!owner) {
      throw AppError.notFound("Tweet");
    }

    // 2. Check ownership — only the author can edit
    if (owner.authorId !== userId) {
      throw AppError.forbidden("You can only edit your own tweets");
    }

    // 3. Update and return (pass userId for correct isLiked in response)
    const updated = await repo.update(id, data, userId);
    return toTweetResponse(updated);
  },

  // ─── Delete (ownership check) ───────────────────────────────────────

  delete: async (id: number, userId: number): Promise<void> => {
    // 1. Lightweight ownership check — only fetch authorId, not full relations
    const owner = await repo.findOwner(id);
    if (!owner) {
      throw AppError.notFound("Tweet");
    }

    // 2. Check ownership — only the author can delete
    if (owner.authorId !== userId) {
      throw AppError.forbidden("You can only delete your own tweets");
    }

    // 3. Delete (cascade handles comments/likes)
    await repo.delete(id);
  },

  // ─── Toggle Like ────────────────────────────────────────────────────
  //
  // Race condition safety:
  //   Rapid clicks can cause concurrent requests where findLike returns
  //   stale data. We catch Prisma errors instead of crashing with 500:
  //   - P2002 (unique violation) → createLike raced, like already exists
  //   - P2025 (record not found) → deleteLike raced, like already gone

  toggleLike: async (
    userId: number,
    tweetId: number,
  ): Promise<{ liked: boolean; likesCount: number }> => {
    // 1. Verify tweet exists
    const tweet = await repo.findById(tweetId);
    if (!tweet) {
      throw AppError.notFound("Tweet");
    }

    // 2. Check if already liked
    const existingLike = await repo.findLike(userId, tweetId);

    let liked: boolean;

    if (existingLike) {
      // Already liked → unlike
      try {
        await repo.deleteLike(userId, tweetId);
        liked = false;
      } catch (error: unknown) {
        // P2025: another request already deleted this like
        if (isPrismaError(error, "P2025")) {
          liked = false;
        } else {
          throw error;
        }
      }
    } else {
      // Not liked → like
      try {
        await repo.createLike(userId, tweetId);
        liked = true;
      } catch (error: unknown) {
        // P2002: another request already created this like
        if (isPrismaError(error, "P2002")) {
          liked = true;
        } else {
          throw error;
        }
      }
    }

    // 3. Get updated count (always accurate — reads after write)
    const likesCount = await repo.getLikesCount(tweetId);

    return { liked, likesCount };
  },
});
