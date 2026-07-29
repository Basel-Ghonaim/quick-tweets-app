/**
 * Comment module type definitions — interfaces and data shapes.
 *
 * Purpose:
 * - Defines DTOs for API responses (CommentResponse)
 * - Defines offset pagination types (OffsetParams, OffsetMeta)
 * - Defines ICommentRepository interface (database operations)
 * - Defines ICommentService interface (business logic contract)
 *
 * Principle: DIP — service depends on ICommentRepository, not on Prisma.
 * Principle: ISP — repository and service contracts are separate.
 */

import type { DbClient } from "../../shared/database/index.js";
import type { AuthorEmbed } from "../../shared/types/index.js";

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** The single media file on a comment — the public read token, never the internal reference. */
export interface CommentMediaResponse {
  token: string;
}

/** Comment shape returned to the frontend. */
export interface CommentResponse {
  id: number;
  body: string;
  /** The comment's single media file, or `null`. Resolved from the internal reference. */
  media: CommentMediaResponse | null;
  author: AuthorEmbed;
  tweetId: number;
  createdAt: Date;
}

// ─── Offset Pagination ──────────────────────────────────────────────────────

/** Input params for offset-based pagination. */
export interface OffsetParams {
  page: number;
  limit: number;
}

/** Pagination metadata returned with offset-paginated responses. */
export interface OffsetMeta {
  currentPage: number;
  limit: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─── Raw DB Type ─────────────────────────────────────────────────────────────

/** Comment from DB with included author relation (before DTO transformation). */
export interface CommentWithRelations {
  id: number;
  body: string;
  authorId: number;
  tweetId: number;
  /** Internal media reference (MediaObject.id) or null; resolved to a token at the boundary. */
  mediaId: number | null;
  createdAt: Date;
  author: {
    id: number;
    username: string;
    name: string | null;
    profileImage: string | null;
  };
}

// ─── Repository Interface ────────────────────────────────────────────────────

/**
 * ICommentRepository — database operations contract for comments.
 *
 * Consumed by: CommentService
 * Implemented by: createCommentRepository (comment.repository.ts)
 */
export interface ICommentRepository {
  tweetExists(tweetId: number): Promise<boolean>;

  findMany(tweetId: number, skip: number, limit: number): Promise<CommentWithRelations[]>;

  count(tweetId: number): Promise<number>;

  findById(id: number): Promise<CommentWithRelations | null>;

  create(
    authorId: number,
    tweetId: number,
    body: string,
    mediaId?: number | null,
    client?: DbClient,
  ): Promise<CommentWithRelations>;

  update(
    id: number,
    data: { body?: string; mediaId?: number | null },
    client?: DbClient,
  ): Promise<CommentWithRelations>;

  delete(id: number, client?: DbClient): Promise<void>;

  /** Lightweight query — authorId (ownership) + the current media reference (to end it). */
  findOwner(id: number, client?: DbClient): Promise<{ authorId: number; mediaId: number | null } | null>;

  /** The tweet's comments that hold a media reference — so each can be ended before deletion. */
  findMediaRefsByTweet(
    tweetId: number,
    client?: DbClient,
  ): Promise<{ id: number; mediaId: number }[]>;

  /** Delete every comment on a tweet (bulk); returns the number removed. */
  deleteByTweet(tweetId: number, client?: DbClient): Promise<number>;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/**
 * ICommentService — business logic contract for comments.
 *
 * Consumed by: CommentController
 * Implemented by: createCommentService (comment.service.ts)
 */
export interface ICommentService {
  getComments(
    tweetId: number,
    params: OffsetParams,
  ): Promise<{ data: CommentResponse[]; meta: OffsetMeta }>;

  /** `mediaToken` is the public read token of a file the author uploaded; attach-authorized. */
  create(
    authorId: number,
    tweetId: number,
    body: string,
    mediaToken?: string,
  ): Promise<CommentResponse>;

  update(
    commentId: number,
    userId: number,
    data: CommentUpdate,
  ): Promise<CommentResponse>;

  delete(commentId: number, userId: number): Promise<void>;

  /**
   * Delete every comment on a tweet, ending each comment's media reference
   * first — the dependent-deletion primitive the tweet-deletion use-case calls
   * (comments own their `comment:{id}` references; no other feature composes
   * that tag). Runs in the **caller's** transaction.
   */
  deleteForTweet(tweetId: number, client: DbClient): Promise<void>;
}

/**
 * A comment edit. `media` follows full-replacement semantics:
 * - **absent** (`undefined`) → media left unchanged;
 * - `{ token }` → set or replace the file;
 * - `null` → remove the file.
 */
export interface CommentUpdate {
  body?: string;
  media?: CommentMediaResponse | null;
}
