/**
 * Tweet validators — Zod schemas for tweet endpoint request validation.
 *
 * Purpose:
 * - createTweetSchema: validates POST /tweets body
 * - updateTweetSchema: validates PATCH /tweets/:id body
 * - cursorQuerySchema: validates cursor pagination query params (moved to shared/validators)
 *
 * Note: DELETE /tweets/:id and POST /tweets/:id/like need no body validation.
 * The :id param is parsed by the controller.
 *
 * Principle: SRP — only schema definitions, no business logic.
 */

import { z } from "zod";
import { bodyTextField } from "../../shared/validation/index.js";
import { cursorQuerySchema } from "../../shared/validators/index.js";
import { MAX_TWEET_MEDIA } from "./tweet.types.js";

// ─── Media references ────────────────────────────────────────────────────────

/**
 * Ordered media read tokens. Array order is display order.
 *
 * Only shape and count are checked here — whether a token exists and whether
 * the author may attach it is Media's to answer, and asking here would both
 * duplicate that authority and leak whether a token exists.
 */
const mediaTokensSchema = z
  .array(z.string().trim().min(1, "A media reference cannot be empty"))
  .max(MAX_TWEET_MEDIA, `A tweet may carry at most ${MAX_TWEET_MEDIA} media items`)
  .refine((tokens) => new Set(tokens).size === tokens.length, {
    message: "The same media item cannot be attached twice to one tweet",
  });

// ─── Feed Query ──────────────────────────────────────────────────────────────

export const feedQuerySchema = cursorQuerySchema.extend({
  author: z.string().trim().optional(),
});

// ─── Create Tweet ────────────────────────────────────────────────────────────

export const createTweetSchema = z.object({
  body: bodyTextField("Tweet body", z.string({ error: "Tweet body is required" })),
  media: mediaTokensSchema.optional(),
});

// ─── Update Tweet ────────────────────────────────────────────────────────────

export const updateTweetSchema = z
  .object({
    body: bodyTextField("Tweet body").optional(),
    // Full replacement: the complete ordered array, not a delta. Omitted leaves
    // the tweet's media untouched; an empty array removes all of it.
    media: mediaTokensSchema.optional(),
  })
  .refine((data) => data.body !== undefined || data.media !== undefined, {
    message: "At least one field must be provided",
  });
