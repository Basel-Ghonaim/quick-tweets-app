/**
 * Shared type definitions — reusable types across modules.
 *
 * Purpose:
 * - AuthorEmbed: lightweight user snapshot for tweet/comment responses
 * - CursorParams: cursor pagination input (cursor + limit)
 * - CursorMeta: cursor pagination metadata (nextCursor, hasMore)
 *
 * These were originally in tweet.types.ts but are needed by
 * Comments, Users, and Follow modules — extracted here to avoid
 * cross-module imports and duplication.
 */

// ─── Author Embed ────────────────────────────────────────────────────────────

/** Lightweight user snapshot embedded in tweet/comment responses. */
export interface AuthorEmbed {
  id: number;
  username: string;
  name: string;
  profileImage: string | null;
}

// ─── Cursor Pagination ──────────────────────────────────────────────────────

/** Input params for cursor-based pagination. */
export interface CursorParams {
  cursor?: number;
  limit: number;
}

/** Metadata returned with cursor-paginated responses. */
export interface CursorMeta {
  nextCursor: string | null;
  limit: number;
  hasMore: boolean;
}
