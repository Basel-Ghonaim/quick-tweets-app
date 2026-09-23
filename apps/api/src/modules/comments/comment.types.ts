/**
 * Comment module type definitions — interfaces and data shapes.
 *
 * Purpose:
 * - Defines DTOs for API responses (CommentResponse)
 * - Re-uses the shared cursor pagination types (CursorParams, CursorMeta)
 * - Defines ICommentRepository interface (database operations)
 * - Defines ICommentService interface (business logic contract)
 *
 * Principle: DIP — service depends on ICommentRepository, not on Prisma.
 * Principle: ISP — repository and service contracts are separate.
 */

import type { DbClient } from "../../shared/database/index.js";
import type { AuthorEmbed, CursorParams, CursorMeta } from "../../shared/types/index.js";
import type { AuthorRow } from "../../shared/utils/index.js";

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
  /** The comment this one answers, or `null` for a top-level comment. */
  parentId: number | null;
  /**
   * How many replies this comment has. Present on top-level comments only:
   * a reply cannot be answered, so a count there would be a number nothing
   * renders and nothing keeps honest.
   */
  repliesCount?: number;
  createdAt: Date;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * Both comment lists are cursor-paginated, on the shared types. A page number
 * shifts every page after an insert or a delete, so a reader scrolling a live
 * thread skips comments or sees them twice; a cursor does not.
 */
export type { CursorParams, CursorMeta };

// ─── Raw DB Type ─────────────────────────────────────────────────────────────

/** Comment from DB with included author relation (before DTO transformation). */
export interface CommentWithRelations {
  id: number;
  body: string;
  authorId: number;
  tweetId: number;
  parentId: number | null;
  /** Internal media reference (MediaObject.id) or null; resolved to a token at the boundary. */
  mediaId: number | null;
  createdAt: Date;
  author: AuthorRow;
  /** Reply tally from the same query — surfaced for top-level comments only. */
  _count: { replies: number };
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

  /** A tweet's top-level comments, oldest first. Fetches `limit + 1` for `hasMore`. */
  findThread(tweetId: number, params: CursorParams): Promise<CommentWithRelations[]>;

  /** One comment's replies, oldest first. Fetches `limit + 1` for `hasMore`. */
  findReplies(parentId: number, params: CursorParams): Promise<CommentWithRelations[]>;

  /** The shape a parent must be checked against: does it exist, and is it top-level? */
  findParent(id: number): Promise<{ id: number; tweetId: number; parentId: number | null } | null>;

  findById(id: number): Promise<CommentWithRelations | null>;

  create(
    data: {
      authorId: number;
      tweetId: number;
      body: string;
      mediaId?: number | null;
      parentId?: number | null;
    },
    client?: DbClient,
  ): Promise<CommentWithRelations>;

  update(
    id: number,
    data: { body?: string; mediaId?: number | null },
    client?: DbClient,
  ): Promise<CommentWithRelations>;

  delete(id: number, client?: DbClient): Promise<void>;

  /**
   * Lightweight query — authorId (ownership), the current media reference (to
   * end it), and the level, which decides whether this delete has dependents.
   */
  findOwner(
    id: number,
    client?: DbClient,
  ): Promise<{ authorId: number; mediaId: number | null; parentId: number | null } | null>;

  /** A comment's replies that hold a media reference — so each can be ended before deletion. */
  findReplyMediaRefs(
    parentId: number,
    client?: DbClient,
  ): Promise<{ id: number; mediaId: number }[]>;

  /** Delete every reply under one comment; returns the number removed. */
  deleteRepliesOf(parentId: number, client?: DbClient): Promise<number>;

  /** The tweet's comments that hold a media reference — so each can be ended before deletion. */
  findMediaRefsByTweet(
    tweetId: number,
    client?: DbClient,
  ): Promise<{ id: number; mediaId: number }[]>;

  /**
   * Delete every reply on a tweet (bulk); returns the number removed. Runs
   * before `deleteByTweet`, because the parent foreign key is RESTRICT.
   */
  deleteRepliesByTweet(tweetId: number, client?: DbClient): Promise<number>;

  /** Delete every remaining comment on a tweet (bulk); returns the number removed. */
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
  /** A tweet's top-level comments. `404` if the tweet does not exist. */
  getThread(
    tweetId: number,
    params: CursorParams,
  ): Promise<{ data: CommentResponse[]; meta: CursorMeta }>;

  /** One comment's replies. `404` if the parent does not exist. */
  getReplies(
    parentId: number,
    params: CursorParams,
  ): Promise<{ data: CommentResponse[]; meta: CursorMeta }>;

  /**
   * `mediaToken` is the public read token of a file the author uploaded;
   * attach-authorized. `parentId` makes this a reply: the parent must exist
   * (`404`), sit on the same tweet and be top-level (`422` for either).
   */
  create(
    authorId: number,
    tweetId: number,
    body: string,
    mediaToken?: string,
    parentId?: number,
  ): Promise<CommentResponse>;

  update(
    commentId: number,
    userId: number,
    data: CommentUpdate,
  ): Promise<CommentResponse>;

  /** Deleting a top-level comment takes its replies with it, in one transaction. */
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
