/**
 * Comment routes — Express router wiring validators, guards, and controller.
 *
 * Purpose:
 * - GET    /              → validate(query) → controller.getComments
 * - POST   /              → authGuard → validate(body) → controller.create
 * - PATCH  /:commentId    → authGuard → validate(body) → controller.update
 * - DELETE /:commentId    → authGuard → controller.delete
 *
 * mergeParams: true is required because this router is mounted as a child of
 * /api/v1/tweets/:tweetId/comments — without it, req.params.tweetId would be undefined.
 *
 * Rate limiting: applied at app.ts level via apiLimiter.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import { createCommentController } from "./comment.controller.js";
import { createCommentSchema, updateCommentSchema, offsetQuerySchema } from "./comment.validator.js";

const controller = createCommentController();

export const commentRoutes = Router({ mergeParams: true });

// ─── Public Routes (no auth required) ────────────────────────────────────────

commentRoutes.get("/", validate(offsetQuerySchema, "query"), controller.getComments);

// ─── Protected Routes (auth required) ────────────────────────────────────────

commentRoutes.post("/", authGuard, validate(createCommentSchema), controller.create);
commentRoutes.patch("/:commentId", authGuard, validate(updateCommentSchema), controller.update);
commentRoutes.delete("/:commentId", authGuard, controller.delete);
