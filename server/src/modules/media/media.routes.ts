/**
 * Media routes — the module's HTTP surface (write side; the read endpoint
 * arrives with its own Work Item).
 *
 * Purpose:
 * - POST /grants → mediaMintLimiter → controller.mintGrant   (pre-auth upload grant, ADR 0007)
 * - POST /      → optionalAuth → controller.ingest           (single Media-owned ingest boundary)
 *
 * Auth:
 * - /grants is unauthenticated by design (it serves pre-auth flows) and
 *   strictly rate-limited — minting is where the grant model's abuse economics
 *   are controlled.
 * - / (ingest) accepts an authenticated principal (optionalAuth Bearer) or an
 *   X-Upload-Grant header; the controller rejects requests with neither.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { apiLimiter, mediaMintLimiter } from "../../middleware/rateLimiter.js";
import { createMediaController } from "./media.controller.js";

const controller = createMediaController();

export const mediaRoutes = Router();

mediaRoutes.post("/grants", mediaMintLimiter, controller.mintGrant);
mediaRoutes.post("/", apiLimiter, optionalAuth, controller.ingest);
