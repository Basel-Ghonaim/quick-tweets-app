/**
 * Tweet service — business logic for tweets.
 *
 * Purpose:
 * - getFeed(): cursor pagination with n+1 slice, DTO transformation
 * - getById(): single tweet lookup with 404 handling
 * - create(): create tweet and return as DTO
 * - update(): ownership check → update → return as DTO
 * - delete(): ownership check → delete
 * - setLike() / clearLike(): write the wanted state, idempotently
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
  mediaResolution,
  MediaAttachError,
  type IMediaOwnership,
  type IMediaReferences,
  type IMediaResolution,
} from "../media/index.js";
import { createTweetRepository } from "./tweet.repository.js";
import type {
  ITweetRepository,
  ITweetService,
  TweetMediaRef,
  TweetResponse,
  TweetWithRelations,
} from "./tweet.types.js";
import type { CursorParams, CursorMeta, LikeState } from "../../shared/types/index.js";
import { avatarReferencesOf, isPrismaError } from "../../shared/utils/index.js";
import { toTweetResponse } from "./tweet.mapper.js";
import { resolveFollowState, followStateOf } from "../../shared/social/index.js";

// ─── Media port ──────────────────────────────────────────────────────────────

/** The Media surfaces tweets consume, grouped into one injected dependency. */
export interface TweetMediaPort {
  ownership: IMediaOwnership;
  references: IMediaReferences;
  resolution: IMediaResolution;
}

const defaultMediaPort: TweetMediaPort = {
  ownership: mediaOwnership,
  references: mediaReferences,
  resolution: mediaResolution,
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
  // One batched, ascending-id-ordered `FOR UPDATE` authorize: the whole set is
  // locked and validated atomically (deadlock-free) and serialized against
  // reclamation. Input order is preserved, so the array index is the position.
  const attached = await media.ownership.authorizeAttachMany(
    tokens.map((token) => ({ token, ownerId: authorId })),
    tx,
  );
  return attached.map(({ referenceId }, position) => ({ mediaId: referenceId, position }));
};

/**
 * Coordinate a tweet's media set changing from `before` to `after`.
 *
 * Signals fire on the **set difference only**. Rows are replaced wholesale, so
 * an object that merely moved position is written again — but it never stopped
 * being referenced, and ending then re-beginning it would be churn that
 * misrepresents what happened.
 */
const coordinateRefChange = async (
  media: TweetMediaPort,
  tweetId: number,
  before: TweetMediaRef[],
  after: TweetMediaRef[],
  tx: DbClient,
): Promise<void> => {
  const referrer = tweetReferrer(tweetId);
  const had = new Set(before.map((ref) => ref.mediaId));
  const has = new Set(after.map((ref) => ref.mediaId));

  for (const mediaId of had) {
    if (!has.has(mediaId)) await media.references.referenceEnded({ mediaId, referrer }, tx);
  }
  for (const mediaId of has) {
    if (!had.has(mediaId)) await media.references.referenceBegan({ mediaId, referrer }, tx);
  }
};

/**
 * Resolve every media and avatar reference on a page of tweets in **one** query,
 * then map. Resolving per tweet — or per object — would be an N+1 over a feed.
 */
const toResponses = async (
  media: TweetMediaPort,
  tweets: TweetWithRelations[],
  readerId?: number,
): Promise<TweetResponse[]> => {
  const referenceIds = [
    ...tweets.flatMap((tweet) => tweet.media.map((ref) => ref.mediaId)),
    ...avatarReferencesOf(tweets.map((tweet) => tweet.author)),
  ];
  const [tokens, follow] = await Promise.all([
    media.resolution.resolveTokens(referenceIds),
    resolveFollowState(readerId, tweets.map((tweet) => tweet.author.id)),
  ]);
  return tweets.map((tweet) =>
    toTweetResponse(tweet, tokens, followStateOf(follow, tweet.author.id)),
  );
};

/** One tweet, resolved through the same batched path. */
const toResponse = async (
  media: TweetMediaPort,
  tweet: TweetWithRelations,
  readerId?: number,
): Promise<TweetResponse> => (await toResponses(media, [tweet], readerId))[0]!;

/** Media that could not be attached is a request problem, not a server fault. */
const asAttachFailure = (err: unknown): unknown =>
  err instanceof MediaAttachError
    ? AppError.validation("Tweet could not be saved", {
        media: ["One or more media items could not be attached; please re-upload and try again"],
      })
    : err;

/**
 * Whether a submitted body is an edit of the stored one, as the fields a Prisma
 * update takes: `{ editedAt: <now> }` when the text changed, and `{}` when it did
 * not, so the column is left exactly as it was.
 *
 * An absent body is not an edit, and neither is an identical one — the plan asks
 * for a marker shown *"only when it was actually edited"*, and nothing a reader
 * sees has changed in either case. The submitted value is already trimmed by the
 * validator, so this compares like with like.
 */
const textChanged = (submitted: string | undefined, stored: string): { editedAt?: Date } =>
  submitted !== undefined && submitted !== stored ? { editedAt: new Date() } : {};

/**
 * Liking something that is not there is a `404`, exactly as reading it is. The
 * guard runs before the write so a like cannot be created against a tweet the
 * reader can no longer see.
 */
const assertTweetExists = async (repo: ITweetRepository, tweetId: number): Promise<void> => {
  if ((await repo.findById(tweetId)) === null) {
    throw AppError.notFound("Tweet");
  }
};

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
      data: await toResponses(media, sliced, userId),
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
      data: await toResponses(media, sliced, userId),
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
      data: await toResponses(media, sliced, userId),
      meta,
    };
  },

  // ─── Single Tweet ───────────────────────────────────────────────────

  getById: async (id: number, userId?: number): Promise<TweetResponse> => {
    const tweet = await repo.findById(id, userId);

    if (!tweet) {
      throw AppError.notFound("Tweet");
    }

    return toResponse(media, tweet, userId);
  },

  // ─── Create ─────────────────────────────────────────────────────────

  create: async (
    authorId: number,
    body: string,
    mediaTokens: string[] = [],
  ): Promise<TweetResponse> => {
    if (mediaTokens.length === 0) {
      return toResponse(media, await repo.create(authorId, body));
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
        // `created` was read before its media rows existed.
        return { ...created, media: await repo.findMediaRefs(created.id, tx) };
      });
      // No reader passed: the answer goes to the author, and following yourself
      // is refused — so the pair is known without spending a query on it.
      return toResponse(media, tweet);
    } catch (err) {
      throw asAttachFailure(err);
    }
  },

  // ─── Update (ownership check) ───────────────────────────────────────

  update: async (
    id: number,
    userId: number,
    data: { body?: string; media?: string[] },
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

    // 3. Did the *text* change? Decided once, here, so both branches below carry
    //    the same answer — an edit that changes the body and the images together
    //    must not lose its marker to the media path.
    //
    //    An image added, replaced, removed or reordered is **not** an edit, and
    //    neither is re-submitting the same text: nothing a reader sees changed.
    //    `editedAt: undefined` leaves the column exactly as it was, so a marker
    //    already set is never cleared.
    const edited = textChanged(data.body, owner.body);

    // 4. Body-only edits leave media untouched and need no transaction.
    if (data.media === undefined) {
      return toResponse(media, await repo.update(id, { body: data.body, ...edited }, userId));
    }

    // 5. Full replacement: the submitted array *is* the tweet's media. The body
    //    edit, the new rows, and the coordination all commit together.
    const mediaTokens = data.media;
    try {
      const updated = await runInTransaction(async (tx) => {
        const before = await repo.findMediaRefs(id, tx);
        const after = await authorizeRefs(media, mediaTokens, userId, tx);
        await repo.replaceMediaRefs(id, after, tx);
        await coordinateRefChange(media, id, before, after, tx);
        return repo.update(id, { body: data.body, ...edited }, userId, tx);
      });
      return toResponse(media, updated);
    } catch (err) {
      throw asAttachFailure(err);
    }
  },

  // ─── Delete (ownership check) ───────────────────────────────────────

  // ─── Delete — split into an ownership assertion and a deletion primitive,
  //     so the tweet-deletion use-case can authorize and delete a tweet and its
  //     dependent comments inside one transaction it owns. ──

  assertOwner: async (id: number, userId: number, client?: DbClient): Promise<void> => {
    const owner = await repo.findOwner(id, client);
    if (!owner) {
      throw AppError.notFound("Tweet");
    }
    if (owner.authorId !== userId) {
      throw AppError.forbidden("You can only delete your own tweets");
    }
  },

  deleteWithMedia: async (id: number, client: DbClient): Promise<void> => {
    // End every reference the tweet holds, then drop the rows *before* the tweet
    // row, so TweetMedia's Restrict stays a backstop that never fires. Likes and
    // other owned data still cascade at the database — they hold no references.
    const refs = await repo.findMediaRefs(id, client);
    await repo.replaceMediaRefs(id, [], client);
    await coordinateRefChange(media, id, refs, [], client);
    await repo.delete(id, client);
  },

  // ─── Set / Clear Like ───────────────────────────────────────────────
  //
  // Set and clear rather than toggle, because a toggle is not repeat-safe: with
  // the like shown before the server answers, a double press or a retry cancels
  // what the reader meant. These two say what the reader wants, so repeating one
  // is a no-op rather than a reversal.
  //
  // Neither reads before it writes. The unique pair already decides the outcome,
  // so attempting the write and accepting the expected conflict is both simpler
  // and tighter than check-then-act, which has a window between the two:
  //   - P2002 (unique violation) → this reader's own like is already there, from
  //     a press that raced this one; still liked
  //   - P2025 (record not found) → their like was already gone; still not liked
  // Either way the answer is the state the reader asked for.

  setLike: async (userId: number, tweetId: number): Promise<LikeState> => {
    await assertTweetExists(repo, tweetId);

    try {
      await repo.createLike(userId, tweetId);
    } catch (error: unknown) {
      if (!isPrismaError(error, "P2002")) throw error;
    }

    return { liked: true, likesCount: await repo.getLikesCount(tweetId) };
  },

  clearLike: async (userId: number, tweetId: number): Promise<LikeState> => {
    await assertTweetExists(repo, tweetId);

    try {
      await repo.deleteLike(userId, tweetId);
    } catch (error: unknown) {
      if (!isPrismaError(error, "P2025")) throw error;
    }

    return { liked: false, likesCount: await repo.getLikesCount(tweetId) };
  },
});
