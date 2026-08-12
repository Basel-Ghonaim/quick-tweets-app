import { z } from "zod";

/**
 * The single source of truth for the username constraint: lowercase-only
 * (`^[a-z0-9_]+$`), 4–20 chars, rejected-not-normalized. Registration and the
 * self-service username edit both compose this one field, so the rule can never
 * drift between the two.
 */
export const usernameField = z
  .string({ error: "Username is required" })
  .min(4, "Username must be at least 4 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-z0-9_]+$/,
    "Username can only contain lowercase letters, numbers, and underscores",
  )
  .trim();
