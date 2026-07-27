/**
 * Media routes — the module's HTTP surface (write side; the read endpoint
 * arrives with its own Work Item).
 *
 * Purpose:
 * - POST / → authGuard → controller.ingest   (single Media-owned ingest boundary)
 *
 * Auth:
 * - / (ingest) requires an authenticated principal (authGuard Bearer). Every
 *   ingested object therefore has an owner — there is no unauthenticated /
 *   grant-evidenced ingest path (ADR 0008: authenticated-only ownership).
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import { apiLimiter } from "../../middleware/rateLimiter.js";
import { createMediaController } from "./media.controller.js";

const controller = createMediaController();

export const mediaRoutes = Router();

mediaRoutes.post("/", apiLimiter, authGuard, controller.ingest);
