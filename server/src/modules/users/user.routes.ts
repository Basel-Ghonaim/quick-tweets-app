/**
 * User routes — Express router wiring guards and controller.
 *
 * Purpose:
 * - GET /:username         → optionalAuth → controller.getProfile
 *
 * This endpoint uses optionalAuth for isFollowing.
 * Rate limiting: applied at app.ts level via apiLimiter.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { createUserController } from "./user.controller.js";

const controller = createUserController();

export const userRoutes = Router();

// ─── Public Routes (optionalAuth for isFollowing) ────────────────────────────

userRoutes.get("/:username", optionalAuth, controller.getProfile);
