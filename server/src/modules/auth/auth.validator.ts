/**
 * Auth validators — Zod schemas for auth endpoint request validation.
 *
 * Current purpose:
 * - registerSchema: validates registration input (username, name, email, password)
 * - loginSchema: validates login input (username, password)
 * - refreshSchema: validates refresh token input
 * - logoutSchema: validates logout input (refresh token)
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
    .max(16, "Password must be at most 16 characters"),
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

// ─── Refresh Token ───────────────────────────────────────────────────────────

export const refreshSchema = z.object({
  refreshToken: z
    .string({ error: "Refresh token is required" })
    .min(1, "Refresh token is required"),
});

// ─── Logout ──────────────────────────────────────────────────────────────────

export const logoutSchema = z.object({
  refreshToken: z
    .string({ error: "Refresh token is required" })
    .min(1, "Refresh token is required"),
});
