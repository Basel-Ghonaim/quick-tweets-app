/**
 * Media read route — the stable public read boundary (ADR 0005 Decision 4).
 *
 * Mounted **top-level**, outside `/api/v1` (like `/health`), so the token URL
 * is embeddable and stable across API versions: `GET /media/:token`. It ships
 * **public** — the resolution-time access seam lives in the service, not here.
 * No rate limiter: reads are cacheable and high-volume by design (many images
 * per page); abuse protection is a caching/CDN concern, not a per-IP limit.
 *
 * Principle: SRP — only the route definition.
 */

import { Router } from "express";
import { createMediaController } from "./media.controller.js";

const controller = createMediaController();

export const mediaReadRoutes = Router();

mediaReadRoutes.get("/:token", controller.read);
