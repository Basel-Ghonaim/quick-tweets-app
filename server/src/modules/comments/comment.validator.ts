/**
 * Comment validators — Zod schemas for comment endpoint request validation.
 *
 * Purpose:
 * - createCommentSchema: validates POST /tweets/:tweetId/comments body
 * - updateCommentSchema: validates PATCH /tweets/:tweetId/comments/:commentId body
 * - offsetQuerySchema: validates offset pagination query params (page, limit)
 *
 * Principle: SRP — only schema definitions, no business logic.
 */

import { z } from "zod";

// ─── Create Comment ──────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  body: z
    .string({ error: "Comment body is required" })
    .min(1, "Comment body cannot be empty")
    .max(280, "Comment body must be at most 280 characters")
    .trim(),
});

// ─── Update Comment ──────────────────────────────────────────────────────────

export const updateCommentSchema = z
  .object({
    body: z
      .string()
      .min(1, "Comment body cannot be empty")
      .max(280, "Comment body must be at most 280 characters")
      .trim()
      .optional(),
  })
  .refine((data) => data.body !== undefined, {
    message: "At least one field must be provided",
  });

// ─── Offset Query Params ─────────────────────────────────────────────────────

/**
 * Validates query params for offset-paginated endpoints.
 *
 * Query strings arrive as strings, so we coerce to numbers.
 * Example: ?page=2&limit=20 → { page: 2, limit: 20 }
 */
export const offsetQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
