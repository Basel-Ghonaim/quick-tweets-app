/**
 * Comment validators — Zod schemas for comment endpoint request validation.
 *
 * Purpose:
 * - createCommentSchema: validates POST /comments body
 * - updateCommentSchema: validates PATCH /comments/:id body
 * - commentQuerySchema: validates offset pagination query params (page, limit) and tweetId
 *
 * Principle: SRP — only schema definitions, no business logic.
 */

import { z } from "zod";

// ─── Media reference ─────────────────────────────────────────────────────────

/**
 * A single media file, referenced by its public read token — the shape a client
 * submits. Only shape is checked here; whether the token exists and whether the
 * author may attach it is Media's to answer (asking here would duplicate that
 * authority and leak whether a token exists).
 */
const mediaRefSchema = z.object({
  token: z.string().trim().min(1, "A media reference cannot be empty"),
});

// ─── Create Comment ──────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  tweetId: z.coerce
    .number({ error: "Tweet ID is required" })
    .int("Tweet ID must be an integer")
    .positive("Tweet ID must be a positive number"),
  body: z
    .string({ error: "Comment body is required" })
    .min(1, "Comment body cannot be empty")
    .max(280, "Comment body must be at most 280 characters")
    .trim(),
  media: mediaRefSchema.optional(),
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
export const commentQuerySchema = z.object({
  tweetId: z.coerce
    .number({ error: "Tweet ID is required" })
    .int("Tweet ID must be an integer")
    .positive("Tweet ID must be a positive number"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
