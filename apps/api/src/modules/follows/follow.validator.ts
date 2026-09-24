/**
 * Follow validators — Zod schemas for the follows module's own query parameters.
 * The follower and following lists take the shared cursor schema.
 */

import { z } from "zod";

// A bounded list, not paged: the sidebar asks for 3, and "Show more" for up to 20.
export const suggestionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(3),
  // The person whose profile is being viewed, by current or former handle.
  exclude: z.string().trim().min(1).optional(),
});
