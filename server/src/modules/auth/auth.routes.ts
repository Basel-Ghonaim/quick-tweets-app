/**
 * Auth routes — Express router wiring validators, guards, and controller.
 *
 * Current purpose:
 * - POST /register → validate(registerSchema) → controller.register
 * - POST /login    → validate(loginSchema)    → controller.login
 * - POST /logout   → controller.logout   (reads cookie, no body validation)
 * - POST /refresh  → controller.refresh  (reads cookie, no body validation)
 * - GET  /me       → authGuard           → controller.me
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
import { registerSchema, loginSchema } from "./auth.validator.js";

const controller = createAuthController();

export const authRoutes = Router();

// ─── Public Routes (no auth required) ────────────────────────────────────────

authRoutes.post("/register", validate(registerSchema), controller.register);
authRoutes.post("/login", validate(loginSchema), controller.login);
authRoutes.post("/logout", controller.logout);
authRoutes.post("/refresh", controller.refresh);

// ─── Protected Routes (auth required) ────────────────────────────────────────

authRoutes.get("/me", authGuard, controller.me);
