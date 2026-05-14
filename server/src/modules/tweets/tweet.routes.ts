/**
 * Tweet routes — Express router wiring validators, guards, and controller.
 *
 * Purpose:
 * - GET    /              → optionalAuth → validate(query) → controller.getFeed
 * - GET    /:id           → optionalAuth → controller.getById
 * - POST   /              → authGuard → validate(body) → controller.create
 * - PATCH  /:id           → authGuard → validate(body) → controller.update
 * - DELETE /:id           → authGuard → controller.delete
 * - POST   /:id/like      → authGuard → controller.toggleLike
 *
 * Rate limiting: applied at app.ts level via apiLimiter (100 req/15min).
 *
 * Principle: SRP — only route definitions, no logic.
 * Principle: Layered Architecture — middleware → controller → service → repository.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { createTweetController } from "./tweet.controller.js";
import { createTweetSchema, updateTweetSchema, cursorQuerySchema } from "./tweet.validator.js";

const controller = createTweetController();

export const tweetRoutes = Router();

// ─── Public Routes (optionalAuth for isLiked) ────────────────────────────────

tweetRoutes.get("/", optionalAuth, validate(cursorQuerySchema, "query"), controller.getFeed);
tweetRoutes.get("/:id", optionalAuth, controller.getById);

// ─── Protected Routes (auth required) ────────────────────────────────────────

tweetRoutes.post("/", authGuard, validate(createTweetSchema), controller.create);
tweetRoutes.patch("/:id", authGuard, validate(updateTweetSchema), controller.update);
tweetRoutes.delete("/:id", authGuard, controller.delete);
tweetRoutes.post("/:id/like", authGuard, controller.toggleLike);
