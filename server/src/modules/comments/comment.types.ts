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

import type { AuthorEmbed } from "../../shared/types/index.js";

// Re-export for convenience
export type { AuthorEmbed };

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** Comment shape returned to the frontend. */
export interface CommentResponse {
  id: number;
  body: string;
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
  createdAt: Date;
  author: {
    id: number;
    username: string;
    name: string;
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
  findMany(tweetId: number, skip: number, limit: number): Promise<CommentWithRelations[]>;

  count(tweetId: number): Promise<number>;

  findById(id: number): Promise<CommentWithRelations | null>;

  create(authorId: number, tweetId: number, body: string): Promise<CommentWithRelations>;

  update(id: number, data: { body?: string }): Promise<CommentWithRelations>;

  delete(id: number): Promise<void>;
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

  create(authorId: number, tweetId: number, body: string): Promise<CommentResponse>;

  update(
    commentId: number,
    tweetId: number,
    userId: number,
    data: { body?: string },
  ): Promise<CommentResponse>;

  delete(commentId: number, tweetId: number, userId: number): Promise<void>;
}
