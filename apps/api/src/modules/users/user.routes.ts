/**
 * User routes — Express router wiring guards, validators, and controller.
 *
 * Purpose:
 * - GET   /me           → authGuard → controller.getMe        (self profile)
 * - PATCH /me           → authGuard → validate → controller.updateMe (name/bio/avatar)
 * - GET   /:username    → optionalAuth → controller.getProfile (public profile)
 *
 * `me` is a reserved self-alias resolved from the token (authGuard → req.userId),
 * so its routes are declared **before** `/:username` — otherwise "me" would be
 * matched as a username.
 *
 * Rate limiting: applied at app.ts level via apiLimiter.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { authGuard } from "../../middleware/authGuard.js";
import { validate } from "../../middleware/validate.js";
import { createUserController } from "./user.controller.js";
import { updateMeSchema } from "./user.validator.js";

const controller = createUserController();

export const userRoutes = Router();

// ─── Self (auth required) — declared before /:username ───────────────────────

userRoutes.get("/me", authGuard, controller.getMe);
userRoutes.patch("/me", authGuard, validate(updateMeSchema), controller.updateMe);

// ─── Public Routes (optionalAuth for isFollowing) ────────────────────────────

userRoutes.get("/:username", optionalAuth, controller.getProfile);
