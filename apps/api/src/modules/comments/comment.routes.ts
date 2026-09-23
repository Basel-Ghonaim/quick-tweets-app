/**
 * Comment routes — Express router wiring validators, guards, and controller.
 *
 * Purpose:
 * - GET    /              → validate(query) → controller.list
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
import { createCommentController } from "./comment.controller.js";
import { createCommentSchema, updateCommentSchema, commentQuerySchema } from "./comment.validator.js";

const controller = createCommentController();

export const commentRoutes = Router();

// ─── Public Routes (no auth required) ────────────────────────────────────────

commentRoutes.get("/", validate(commentQuerySchema, "query"), controller.list);

// ─── Protected Routes (auth required) ────────────────────────────────────────

commentRoutes.post("/", authGuard, validate(createCommentSchema), controller.create);
commentRoutes.patch("/:id", authGuard, validate(updateCommentSchema), controller.update);
commentRoutes.delete("/:id", authGuard, controller.delete);
