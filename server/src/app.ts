/**
 * Express application setup.
 *
 * Purpose:
 * - Creates and configures the Express app instance
 * - Registers global middleware (CORS, JSON parsing, helmet, request logger, rate limiting)
 * - Provides a /health endpoint for infrastructure monitoring (includes DB ping)
 * - Registers the global error handler as the last middleware
 *
 * Security:
 * - helmet() sets all recommended HTTP security headers
 * - express.json({ limit }) prevents memory exhaustion DoS
 * - CORS origin is configurable via CORS_ORIGIN env var
 *
 * Future expansion:
 * - Add Multer for file uploads (profile image)
 * - Add compression middleware for response compression
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { tweetRoutes } from "./modules/tweets/tweet.routes.js";
import { commentRoutes } from "./modules/comments/comment.routes.js";
import { userRoutes } from "./modules/users/user.routes.js";
import { followRoutes } from "./modules/follows/follow.routes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { env } from "./config/env.js";
import { prisma } from "./shared/database/index.js";

export const app = express();

// ─── Proxy Trust ─────────────────────────────────────────────────────────────
// Required for correct IP detection behind reverse proxies (Railway, Render, etc.)
// Without this, rate limiting sees all requests from one IP (the proxy's IP).

app.set("trust proxy", 1);

// ─── Global Middleware ───────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(requestLogger);

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

// ─── Feature Routes ──────────────────────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tweets", apiLimiter, tweetRoutes);
app.use("/api/v1/comments", apiLimiter, commentRoutes);
app.use("/api/v1/users", apiLimiter, userRoutes, followRoutes);

// ─── Error Handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);
