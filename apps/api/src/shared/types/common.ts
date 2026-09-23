/**
 * Shared type definitions — reusable types across modules.
 *
 * Purpose:
 * - AuthorEmbed: lightweight user snapshot for tweet/comment responses
 * - CursorParams: cursor pagination input (cursor + limit)
 * - CursorMeta: cursor pagination metadata (nextCursor, hasMore)
 * - LikeState: what a like or unlike answers, for every likeable thing
 *
 * These were originally in tweet.types.ts but are needed by
 * Comments, Users, and Follow modules — extracted here to avoid
 * cross-module imports and duplication.
 */

// ─── Author Embed ────────────────────────────────────────────────────────────

/**
 * Lightweight user snapshot embedded in tweet/comment responses. `name` is
 * optional profile data; when `null`, presentation falls back to `username`.
 */
export interface AuthorEmbed {
  id: number;
  username: string;
  name: string | null;
  avatar: { token: string } | null;
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

// ─── Like State ──────────────────────────────────────────────────────────────

/**
 * What setting or clearing a like answers, for a post and for a comment alike.
 *
 * The shape is shared because the API contract states it once; the machinery
 * behind it is not — tweets and comments each own their own, since they resolve
 * different readers and are coupled to different deletions.
 */
export interface LikeState {
  /** Whether the reader holds a like *now* — not whether this call changed anything. */
  liked: boolean;
  likesCount: number;
}
