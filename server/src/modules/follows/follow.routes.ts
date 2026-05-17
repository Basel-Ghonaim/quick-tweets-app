/**
 * Follow routes — Express router wiring guards and controller.
 *
 * Purpose:
 * - POST   /:username/follow     → authGuard → controller.follow
 * - DELETE /:username/follow     → authGuard → controller.unfollow
 * - GET    /:username/followers  → validate(query) → controller.getFollowers
 * - GET    /:username/following  → validate(query) → controller.getFollowing
 *
 * This router is mounted independently at /api/v1/users in app.ts alongside
 * userRoutes. It uses mergeParams: true so :username is accessible.
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

export const followRoutes = Router({ mergeParams: true });

// ─── Mutation Routes (auth required) ─────────────────────────────────────────

followRoutes.post("/:username/follow", authGuard, controller.follow);
followRoutes.delete("/:username/follow", authGuard, controller.unfollow);

// ─── List Routes (public, cursor-paginated) ──────────────────────────────────

followRoutes.get("/:username/followers", validate(cursorQuerySchema, "query"), controller.getFollowers);
followRoutes.get("/:username/following", validate(cursorQuerySchema, "query"), controller.getFollowing);
