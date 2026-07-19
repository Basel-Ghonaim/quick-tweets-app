/**
 * Auth validators — Zod schemas for auth endpoint request validation.
 *
 * Current purpose:
 * - registerSchema: validates registration input (username, name, email, password)
 * - loginSchema: validates login input (username, password)
 *
 * Note: /refresh and /logout do NOT need body validation.
 * The refresh token is read from an httpOnly cookie (req.cookies), not req.body.
 *
 * Future expansion:
 * - forgotPasswordSchema: validates email for password reset
 * - resetPasswordSchema: validates token + new password
 * - changePasswordSchema: validates old + new password
 *
 * Constraints are aligned with the frontend form schemas (authFormSchemas.ts)
 * to ensure consistent validation on both sides.
 *
 * Principle: SRP — only schema definitions, no business logic.
 */

import { z } from "zod";

// ─── Register ────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  username: z
    .string({ error: "Username is required" })
    .min(4, "Username must be at least 4 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .trim(),

  name: z
    .string({ error: "Name is required" })
    .min(1, "Name is required")
    .max(50, "Name must be at most 50 characters")
    .trim(),

  email: z
    .string({ error: "Email is required" })
    .email("Invalid email format")
    .trim()
    .toLowerCase(),

  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[@$!%*?&#]/, "Password must contain at least one special character (@$!%*?&#)"),

  // Optional avatar to adopt onto the new account (upload-then-submit-reference,
  // ADR 0007). Both parts are required together; the values are content-checked
  // downstream (the token is parsed and the grant is verified during adoption),
  // so here we only assert presence.
  avatar: z
    .object({
      token: z.string({ error: "Avatar token is required" }).min(1),
      grant: z.string({ error: "Avatar grant is required" }).min(1),
    })
    .optional(),
});

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z
    .string({ error: "Username is required" })
    .min(1, "Username is required")
    .trim(),

  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required"),
});
