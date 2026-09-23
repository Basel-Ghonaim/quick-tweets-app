/**
 * Comment routes — Express router wiring validators, guards, and controller.
 *
 * Purpose:
 * - GET    /              → optionalAuth → validate(query) → controller.list
 * - PUT    /:id/like      → authGuard → controller.setLike
 * - DELETE /:id/like      → authGuard → controller.clearLike
 * - POST   /              → authGuard → validate(body) → controller.create
 * - PATCH  /:id    → authGuard → validate(body) → controller.update
 * - DELETE /:id    → authGuard → controller.delete
 *
 * Rate limiting: applied at app.ts level via apiLimiter.
 *
 * Rate limiting: applied at app.ts level via apiLimiter.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { createCommentController } from "./comment.controller.js";
import { createCommentSchema, updateCommentSchema, commentQuerySchema } from "./comment.validator.js";

const controller = createCommentController();

export const commentRoutes = Router();

// ─── Public Routes (optionalAuth for isLiked) ────────────────────────────────

commentRoutes.get("/", optionalAuth, validate(commentQuerySchema, "query"), controller.list);

// ─── Protected Routes (auth required) ────────────────────────────────────────

commentRoutes.post("/", authGuard, validate(createCommentSchema), controller.create);
commentRoutes.patch("/:id", authGuard, validate(updateCommentSchema), controller.update);
commentRoutes.delete("/:id", authGuard, controller.delete);

// Set and clear, not a toggle — the same shape tweets carry, for the same reason.
commentRoutes.put("/:id/like", authGuard, controller.setLike);
commentRoutes.delete("/:id/like", authGuard, controller.clearLike);
