/**
 * Tweet routes — Express router wiring validators, guards, and controller.
 *
 * Purpose:
 * - GET    /              → optionalAuth → validate(query) → controller.getFeed
 * - GET    /:id           → optionalAuth → controller.getById
 * - POST   /              → authGuard → validate(body) → controller.create
 * - PATCH  /:id           → authGuard → validate(body) → controller.update
 * - DELETE /:id           → authGuard → controller.delete
 * - PUT    /:id/like      → authGuard → controller.setLike
 * - DELETE /:id/like      → authGuard → controller.clearLike
 *
 * Rate limiting: applied at app.ts level via apiLimiter (100 req/15min).
 *
 * Principle: SRP — only route definitions, no logic.
 * Principle: Layered Architecture — middleware → controller → service → repository.
 */

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import { editLimiter } from "../../middleware/rateLimiter.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { createTweetController } from "./tweet.controller.js";
import { createTweetSchema, updateTweetSchema, feedQuerySchema } from "./tweet.validator.js";

const controller = createTweetController();

export const tweetRoutes = Router();

// ─── Public Routes (optionalAuth for isLiked) ────────────────────────────────

tweetRoutes.get("/", optionalAuth, validate(feedQuerySchema, "query"), controller.getFeed);
tweetRoutes.get("/:id", optionalAuth, controller.getById);

// ─── Protected Routes (auth required) ────────────────────────────────────────

tweetRoutes.post("/", authGuard, validate(createTweetSchema), controller.create);
// After auth, which names the account it counts; before validation, so every attempt counts.
tweetRoutes.patch("/:id", authGuard, editLimiter, validate(updateTweetSchema), controller.update);
tweetRoutes.delete("/:id", authGuard, controller.delete);
// Set and clear, not a toggle: the verbs carry the idempotency a repeated
// press needs, rather than leaving it to a payload a client might omit.
tweetRoutes.put("/:id/like", authGuard, controller.setLike);
tweetRoutes.delete("/:id/like", authGuard, controller.clearLike);
