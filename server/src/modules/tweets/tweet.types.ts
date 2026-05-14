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

// Re-export shared types so existing consumers don't need to change imports
export type { AuthorEmbed, CursorParams, CursorMeta };

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** Tweet shape returned to the frontend. */
export interface TweetResponse {
  id: number;
  body: string;
  image: string | null;
  author: AuthorEmbed;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: Date;
}


// ─── Repository Interface ────────────────────────────────────────────────────

/** Raw tweet from DB with included relations (before DTO transformation). */
export interface TweetWithRelations {
  id: number;
  body: string;
  image: string | null;
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

  findById(id: number, userId?: number): Promise<TweetWithRelations | null>;

  create(authorId: number, body: string): Promise<TweetWithRelations>;

  update(id: number, data: { body?: string }): Promise<TweetWithRelations>;

  delete(id: number): Promise<void>;

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
