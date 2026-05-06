/**
 * Auth routes — Express router wiring validators, guards, and controller.
 *
 * Current purpose:
 * - POST /register → validate(registerSchema) → controller.register
 * - POST /login    → validate(loginSchema)    → controller.login
 * - POST /logout   → validate(logoutSchema)   → controller.logout
 * - POST /refresh  → validate(refreshSchema)  → controller.refresh
 * - GET  /me       → authGuard               → controller.me
 *
 * Future expansion:
 * - POST /forgot-password → validate → controller.forgotPassword
 * - POST /reset-password  → validate → controller.resetPassword
 * - PATCH /profile        → authGuard → multer → validate → controller.updateProfile
 *
 * Principle: SRP — only route definitions, no logic.
 * Principle: Layered Architecture — middleware → controller → service → repository.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import { createAuthController } from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
} from "./auth.validator.js";

const controller = createAuthController();

export const authRoutes = Router();

// ─── Public Routes (no auth required) ────────────────────────────────────────

authRoutes.post("/register", validate(registerSchema), controller.register);
authRoutes.post("/login", validate(loginSchema), controller.login);
authRoutes.post("/logout", validate(logoutSchema), controller.logout);
authRoutes.post("/refresh", validate(refreshSchema), controller.refresh);

// ─── Protected Routes (auth required) ────────────────────────────────────────

authRoutes.get("/me", authGuard, controller.me);
