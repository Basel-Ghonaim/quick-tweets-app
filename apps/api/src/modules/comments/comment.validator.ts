/**
 * Comment validators — Zod schemas for comment endpoint request validation.
 *
 * Purpose:
 * - createCommentSchema: validates POST /comments body
 * - updateCommentSchema: validates PATCH /comments/:id body
 * - commentQuerySchema: validates the list query — exactly one of tweetId or parentId, plus cursor params
 *
 * Principle: SRP — only schema definitions, no business logic.
 */

import { z } from "zod";
import { bodyTextField } from "../../shared/validation/index.js";
import { cursorQuerySchema } from "../../shared/validators/index.js";

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
  body: bodyTextField("Comment body", z.string({ error: "Comment body is required" })),
  // The comment being answered. Absent means a top-level comment. Whether it
  // exists, sits on this tweet and is itself top-level is the service's to
  // answer — a validator cannot see the row.
  parentId: z.coerce
    .number({ error: "Comment ID must be a number" })
    .int("Comment ID must be an integer")
    .positive("Comment ID must be a positive number")
    .optional(),
  media: mediaRefSchema.optional(),
});

// ─── Update Comment ──────────────────────────────────────────────────────────

export const updateCommentSchema = z
  .object({
    body: bodyTextField("Comment body").optional(),
    // Full-replacement media: omitted → unchanged; `{ token }` → set/replace;
    // `null` → remove. `.nullable().optional()` allows all three.
    media: mediaRefSchema.nullable().optional(),
  })
  .refine((data) => data.body !== undefined || data.media !== undefined, {
    message: "At least one field must be provided",
  });

// ─── List Query Params ───────────────────────────────────────────────────────

/**
 * Validates the list query. Exactly one of `tweetId` (a tweet's top-level
 * comments) or `parentId` (one comment's replies) is required.
 *
 * Both together is refused rather than arbitrated: `parentId` already determines
 * the tweet, so a pair that disagreed would leave the server picking a winner.
 *
 * Cursor params come from the shared schema, so comments do not carry a private
 * pagination default.
 */
export const commentQuerySchema = cursorQuerySchema
  .extend({
    tweetId: z.coerce
      .number()
      .int("Tweet ID must be an integer")
      .positive("Tweet ID must be a positive number")
      .optional(),
    parentId: z.coerce
      .number()
      .int("Comment ID must be an integer")
      .positive("Comment ID must be a positive number")
      .optional(),
  })
  .refine(
    (data) => (data.tweetId === undefined) !== (data.parentId === undefined),
    {
      message: "Provide exactly one of tweetId or parentId",
      path: ["tweetId"],
    },
  );
