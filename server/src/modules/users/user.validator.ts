/**
 * User validators — Zod schemas for user endpoint request validation.
 *
 * - updateMeSchema: validates PATCH /users/me — name/bio/avatar, any subset,
 *   at least one field. The avatar is full-replacement (omitted = unchanged,
 *   `{ token }` = set/replace, `null` = remove); only the shape is checked here,
 *   whether the token is attachable and meets the avatar policy is decided by
 *   Media + the User service (ADR 0008 D6/D7), never the client.
 *
 * Principle: SRP — only schema definitions, no business logic.
 */

import { z } from "zod";
import { usernameField } from "../../shared/validation/index.js";

const avatarRefSchema = z.object({
  token: z.string().trim().min(1, "An avatar reference cannot be empty"),
});

export const updateMeSchema = z
  .object({
    // Optional profile data: omitted = unchanged, `null` = clear (set to NULL),
    // a string = set/replace (validated). name is never derived from username.
    name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name must be at most 50 characters")
      .trim()
      .nullable()
      .optional(),
    // Rename: omitted = unchanged, a string = new handle. Same lowercase-only rule
    // as registration (the single shared source); never cleared.
    username: usernameField.optional(),
    bio: z
      .string()
      .max(160, "Bio must be at most 160 characters")
      .trim()
      .optional(),
    // Full-replacement avatar: omitted → unchanged; `{ token }` → set/replace;
    // `null` → remove. `.nullable().optional()` allows all three.
    avatar: avatarRefSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.username !== undefined ||
      data.bio !== undefined ||
      data.avatar !== undefined,
    { message: "At least one field must be provided" },
  );
