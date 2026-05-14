/**
 * User routes — Express router wiring guards and controller.
 *
 * Purpose:
 * - GET /:username         → optionalAuth → controller.getProfile
 * - GET /:username/tweets  → optionalAuth → validate(query) → controller.getUserTweets
 *
 * Both endpoints use optionalAuth for isFollowing (profile) and isLiked (tweets).
 * Rate limiting: applied at app.ts level via apiLimiter.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { createUserController } from "./user.controller.js";
import { cursorQuerySchema } from "../tweets/tweet.validator.js";

const controller = createUserController();

export const userRoutes = Router();

// ─── Public Routes (optionalAuth for isFollowing / isLiked) ──────────────────

userRoutes.get("/:username", optionalAuth, controller.getProfile);
userRoutes.get("/:username/tweets", optionalAuth, validate(cursorQuerySchema, "query"), controller.getUserTweets);
