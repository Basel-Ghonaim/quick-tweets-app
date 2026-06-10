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
import { createFollowController } from "./follow.controller.js";
import { cursorQuerySchema } from "../../shared/validators/index.js";

const controller = createFollowController();

export const followRoutes = Router();

// ─── Mutation Routes (auth required) ─────────────────────────────────────────

followRoutes.post("/:username", authGuard, controller.follow);
followRoutes.delete("/:username", authGuard, controller.unfollow);

// ─── List Routes (public, cursor-paginated) ──────────────────────────────────

followRoutes.get("/:username/followers", validate(cursorQuerySchema, "query"), controller.getFollowers);
followRoutes.get("/:username/following", validate(cursorQuerySchema, "query"), controller.getFollowing);
