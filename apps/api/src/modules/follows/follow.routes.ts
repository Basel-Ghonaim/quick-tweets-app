/**
 * Follow routes — Express router wiring guards and controller.
 *
 * Purpose:
 * - POST   /:username            → authGuard → controller.follow
 * - DELETE /:username            → authGuard → controller.unfollow
 * - GET    /:username/followers  → validate(query) → controller.getFollowers
 * - GET    /:username/following  → validate(query) → controller.getFollowing
 *
 * This router is mounted independently at /api/v1/follows in app.ts.
 *
 * Rate limiting: applied at app.ts level via apiLimiter.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { createFollowController } from "./follow.controller.js";
import { cursorQuerySchema } from "../../shared/validators/index.js";
import { suggestionsQuerySchema } from "./follow.validator.js";

const controller = createFollowController();

export const followRoutes = Router();

// ─── Mutation Routes (auth required) ─────────────────────────────────────────

followRoutes.post("/:username", authGuard, controller.follow);
followRoutes.delete("/:username", authGuard, controller.unfollow);

// ─── Suggestions (optionalAuth: a guest gets the most-followed) ──────────────

followRoutes.get("/suggestions", optionalAuth, validate(suggestionsQuerySchema, "query"), controller.getSuggestions);

// ─── List Routes (optionalAuth for each row's follow state) ──────────────────

followRoutes.get("/:username/followers", optionalAuth, validate(cursorQuerySchema, "query"), controller.getFollowers);
followRoutes.get("/:username/following", optionalAuth, validate(cursorQuerySchema, "query"), controller.getFollowing);
