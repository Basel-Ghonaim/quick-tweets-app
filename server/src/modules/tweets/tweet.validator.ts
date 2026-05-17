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

// ─── Create Tweet ────────────────────────────────────────────────────────────

export const createTweetSchema = z.object({
  body: z
    .string({ error: "Tweet body is required" })
    .min(1, "Tweet body cannot be empty")
    .max(280, "Tweet body must be at most 280 characters")
    .trim(),
});

// ─── Update Tweet ────────────────────────────────────────────────────────────

export const updateTweetSchema = z
  .object({
    body: z
      .string()
      .min(1, "Tweet body cannot be empty")
      .max(280, "Tweet body must be at most 280 characters")
      .trim()
      .optional(),
  })
  .refine((data) => data.body !== undefined, {
    message: "At least one field must be provided",
  });
