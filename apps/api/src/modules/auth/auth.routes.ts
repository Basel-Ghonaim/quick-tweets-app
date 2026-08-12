/**
 * Auth routes — Express router wiring validators, guards, and controller.
 *
 * Purpose:
 * - POST /register → authLimiter → validate → controller.register
 * - POST /login    → authLimiter → validate → controller.login
 * - POST /logout   → controller.logout   (reads cookie, no body validation)
 * - POST /refresh  → refreshLimiter → controller.refresh  (reads cookie)
 *
 * Rate limiting:
 * - login/register: strict (10 req/15min) — brute force protection
 * - refresh: generous (30 req/15min) — automated silent refresh
 * - logout: no rate limit (single-call endpoints)
 *
 * Principle: SRP — only route definitions, no logic.
 * Principle: Layered Architecture — middleware → controller → service → repository.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import { authLimiter, refreshLimiter } from "../../middleware/rateLimiter.js";
import { createAuthController } from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.validator.js";

const controller = createAuthController();

export const authRoutes = Router();

// ─── Public Routes (no auth required) ────────────────────────────────────────

authRoutes.post("/register", authLimiter, validate(registerSchema), controller.register);
authRoutes.post("/login", authLimiter, validate(loginSchema), controller.login);
authRoutes.post("/logout", controller.logout);
authRoutes.post("/refresh", refreshLimiter, controller.refresh);

// ─── Protected Routes (auth required) ────────────────────────────────────────

authRoutes.post("/logout-all", authGuard, controller.logoutAll);
