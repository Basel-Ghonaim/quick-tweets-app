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
import { isInvisibleOnly, readerTextField, usernameField } from "../../shared/validation/index.js";

const avatarRefSchema = z.object({
  token: z.string().trim().min(1, "An avatar reference cannot be empty"),
});

export const updateMeSchema = z
  .object({
    // Optional profile data: omitted = unchanged, `null` = clear (set to NULL),
    // a string = set/replace (validated). name is never derived from username.
    // Length is counted before trimming, as the profile form counts it; emptiness
    // after, so white space alone is not a name.
    name: readerTextField("Name")
      .max(50, "Name must be at most 50 characters")
      .trim()
      .refine((text) => !isInvisibleOnly(text), "Name is required")
      .nullable()
      .optional(),
    // Rename: omitted = unchanged, a string = new handle. Same lowercase-only rule
    // as registration (the single shared source); never cleared.
    username: usernameField.optional(),
    // An empty bio is how a bio is cleared, so one that shows nothing becomes one.
    bio: readerTextField("Bio")
      .max(160, "Bio must be at most 160 characters")
      .trim()
      .overwrite((text) => (isInvisibleOnly(text) ? "" : text))
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
