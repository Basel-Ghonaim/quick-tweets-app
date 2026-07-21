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

import type { AuthorEmbed, CursorParams, CursorMeta } from "../../shared/types/index.js";

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
export interface TweetResponse {
  id: number;
  body: string;
  /** Ordered media attachments. Always empty until a write path exists (M9). */
  media: TweetMediaResponse[];
  author: AuthorEmbed;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
}


// ─── Repository Interface ────────────────────────────────────────────────────

/** Raw tweet from DB with included relations (before DTO transformation). */
export interface TweetWithRelations {
  id: number;
  body: string;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    username: string;
    name: string;
    profileImage: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
  likes?: { userId: number }[];
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

  create(authorId: number, body: string): Promise<TweetWithRelations>;

  update(id: number, data: { body?: string }, userId?: number): Promise<TweetWithRelations>;

  delete(id: number): Promise<void>;

  /** Lightweight query — only fetches authorId for ownership checks. */
  findOwner(id: number): Promise<{ authorId: number } | null>;

  // ── Like Operations ──
  findLike(userId: number, tweetId: number): Promise<{ id: number } | null>;

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

  create(authorId: number, body: string): Promise<TweetResponse>;

  update(
    id: number,
    userId: number,
    data: { body?: string },
  ): Promise<TweetResponse>;

  delete(id: number, userId: number): Promise<void>;

  toggleLike(
    userId: number,
    tweetId: number,
  ): Promise<{ liked: boolean; likesCount: number }>;
}
