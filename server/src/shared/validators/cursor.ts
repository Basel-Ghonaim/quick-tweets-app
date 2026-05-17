/**
 * Cursor pagination validator — Zod schema for cursor query params.
 *
 * Purpose:
 * Validates query params for all cursor-paginated endpoints (tweets, followers,
 * following, user tweets). Extracted to shared because cursor pagination is a
 * cross-cutting concern used by multiple modules.
 *
 * Query strings arrive as strings, so we coerce to numbers.
 * Example: ?cursor=42&limit=10 → { cursor: 42, limit: 10 }
 *
 * Principle: SRP — only schema definition, no business logic.
 */

import { z } from "zod";

export const cursorQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
