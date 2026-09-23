/**
 * Tweet module type definitions — interfaces and data shapes.
 *
 * Purpose:
 * - Re-exports shared types (AuthorEmbed, CursorParams, CursorMeta)
 * - Defines DTOs for API responses (TweetResponse)
 * - Defines ITweetRepository interface (database operations)
 * - Defines ITweetService interface (business logic contract)
 *
 * Principle: DIP — service depends on ITweetRepository, not on Prisma.
 * Principle: ISP — repository and service contracts are separate.
 */

import type { DbClient } from "../../shared/database/index.js";
import type { AuthorEmbed, CursorParams, CursorMeta, LikeState } from "../../shared/types/index.js";
import type { FollowState } from "../../shared/social/index.js";
import type { AuthorRow } from "../../shared/utils/index.js";

/**
 * The maximum media objects one tweet may carry.
 *
 * **Provisional.** The value is a placeholder until the compose experience is
 * designed — it is the display grid that will decide how many attachments are
 * meaningful, so this is superseded by that design rather than by anything
 * architectural. Enforced server-side regardless: the dropzone's own limit is
 * client-side and untrusted.
 */
export const MAX_TWEET_MEDIA = 4;

/** One ordered media reference on a tweet — the internal reference, never a token. */
export interface TweetMediaRef {
  mediaId: number;
  position: number;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

/**
 * A media item attached to a tweet, in display order.
 *
 * Only the public read token is exposed: the numeric Media Reference stays
 * internal (ADR 0005 Decision 3), and array order *is* the ordering — position
 * is deliberately not on the wire, so ordering has a single source of truth.
 */
export interface TweetMediaResponse {
  token: string;
}

/** Tweet shape returned to the frontend. */
/**
 * A post's author, widened by what the row's ⋯ menu needs: Follow, Following or
 * Follow back. `AuthorEmbed` itself stays as it is — it is shared with comments
 * and with the follow lists, and a comment's author has no Follow button, so
 * widening it would make every thread page resolve a relation nothing renders.
 */
export interface TweetAuthorEmbed extends AuthorEmbed, FollowState {}

export interface TweetResponse {
  id: number;
  body: string;
  /** Ordered media attachments. */
  media: TweetMediaResponse[];
  author: TweetAuthorEmbed;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
  /**
   * When the *text* was last changed, or `null` if it never was. Distinct from
   * `updatedAt`, which moves on any write to the row — including an edit that
   * only changed the images.
   */
  editedAt: Date | null;
}


// ─── Repository Interface ────────────────────────────────────────────────────

/** Raw tweet from DB with included relations (before DTO transformation). */
export interface TweetWithRelations {
  id: number;
  body: string;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  author: AuthorRow;
  _count: {
    likes: number;
    comments: number;
  };
  likes?: { userId: number }[];
  /** Ordered media references — internal ids only; Media resolves them to tokens. */
  media: TweetMediaRef[];
}

/**
 * ITweetRepository — database operations for tweets and likes.
 *
 * Consumed by: TweetService
 * Implemented by: createTweetRepository (tweet.repository.ts)
 */
export interface ITweetRepository {
  // ── Tweet CRUD ──
  findMany(
    params: CursorParams,
    userId?: number,
  ): Promise<TweetWithRelations[]>;

  findAuthorIdByUsername(username: string): Promise<number | null>;

  findByAuthor(
    authorId: number,
    params: CursorParams,
    userId?: number,
  ): Promise<TweetWithRelations[]>;

  findById(id: number, userId?: number): Promise<TweetWithRelations | null>;

  create(authorId: number, body: string, client?: DbClient): Promise<TweetWithRelations>;

  update(
    id: number,
    data: { body?: string; editedAt?: Date },
    userId?: number,
    client?: DbClient,
  ): Promise<TweetWithRelations>;

  delete(id: number, client?: DbClient): Promise<void>;

  // ── Media association (M8 `TweetMedia`) ──

  /** The tweet's current ordered media references. */
  findMediaRefs(tweetId: number, client?: DbClient): Promise<TweetMediaRef[]>;

  /**
   * Replace the tweet's media rows with `refs`, in order. Wholesale replacement
   * rather than an in-place edit: positions are unique per tweet, so shuffling
   * them individually would collide mid-statement.
   */
  replaceMediaRefs(
    tweetId: number,
    refs: TweetMediaRef[],
    client?: DbClient,
  ): Promise<void>;

  /** Lightweight query — only fetches authorId for ownership checks. */
  findOwner(
    id: number,
    client?: DbClient,
  ): Promise<{ authorId: number; body: string } | null>;

  // ── Like Operations ──
  createLike(userId: number, tweetId: number): Promise<void>;

  deleteLike(userId: number, tweetId: number): Promise<void>;

  getLikesCount(tweetId: number): Promise<number>;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/**
 * ITweetService — business logic contract for tweets.
 *
 * Consumed by: TweetController
 * Implemented by: createTweetService (tweet.service.ts)
 */
export interface ITweetService {
  getFeed(
    params: CursorParams,
    userId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }>;

  getByAuthorUsername(
    username: string,
    params: CursorParams,
    userId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }>;

  getByAuthor(
    authorId: number,
    params: CursorParams,
    userId?: number,
  ): Promise<{ data: TweetResponse[]; meta: CursorMeta }>;

  getById(id: number, userId?: number): Promise<TweetResponse>;

  /** `media` are public read tokens, in display order; each is attach-authorized. */
  create(authorId: number, body: string, media?: string[]): Promise<TweetResponse>;

  update(
    id: number,
    userId: number,
    data: { body?: string; media?: string[] },
  ): Promise<TweetResponse>;

  /**
   * Assert `userId` may delete tweet `id` — throws `not_found` / `forbidden`
   * otherwise. Runs in the caller's transaction so the check and the deletion
   * share one boundary (the tweet-deletion use-case authorizes here, first).
   */
  assertOwner(id: number, userId: number, client?: DbClient): Promise<void>;

  /**
   * Delete a tweet, ending its `tweet:{id}` media references first — the
   * tweet-side deletion primitive. No ownership check (the caller asserts it)
   * and no own transaction (runs in the caller's). Likes and other owned data
   * still cascade at the database.
   */
  deleteWithMedia(id: number, client: DbClient): Promise<void>;

  /** Set the reader's like. Idempotent: liking twice leaves one like. */
  setLike(userId: number, tweetId: number): Promise<LikeState>;

  /** Clear the reader's like. Idempotent: unliking twice is not an error. */
  clearLike(userId: number, tweetId: number): Promise<LikeState>;
}
