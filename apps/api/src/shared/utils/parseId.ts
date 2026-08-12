/**
 * parseId — safe integer parsing for route params.
 *
 * Replaces raw `Number(req.params.id)` which silently produces NaN, 0, or floats.
 * Returns a validated positive integer, or throws AppError.validation(400)
 * with a clean error message instead of leaking Prisma internals.
 *
 * Usage in controllers:
 *   const id = parseId(req.params.id, "Tweet ID");
 *   const tweetId = parseId(req.params.tweetId, "Tweet ID");
 *
 * Principle: SRP — only parses and validates, no business logic.
 */

import { AppError } from "../errors/index.js";

/**
 * Parses a route param string into a validated positive integer.
 *
 * @param value - Raw string from req.params (e.g., req.params.id)
 * @param label - Human-readable label for error messages (e.g., "Tweet ID")
 * @returns Validated positive integer
 * @throws AppError.validation(400) if value is not a valid positive integer
 */
export const parseId = (value: string | string[] | undefined, label = "ID"): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw AppError.validation(`${label} must be a positive integer`, {
      [label.toLowerCase().replace(/\s+/g, "_")]: [`Invalid value: "${value}"`],
    });
  }

  return parsed;
};
