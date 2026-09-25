/**
 * Trend routes — Express router wiring the controller.
 *
 * Purpose:
 * - GET / → controller.getTrending
 *
 * This router is mounted at /api/v1/trends in app.ts, behind the general apiLimiter.
 *
 * Principle: SRP — only route definitions, no logic.
 */

import { Router } from "express";
import { createTrendController } from "./trend.controller.js";

const controller = createTrendController();

export const trendRoutes = Router();

// No guard: a guest and a signed-in reader see the same list.
trendRoutes.get("/", controller.getTrending);
