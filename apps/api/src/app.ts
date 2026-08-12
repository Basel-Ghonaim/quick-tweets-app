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
import { mediaRoutes } from "./modules/media/media.routes.js";
import { channelVerificationRoutes } from "./modules/channel-verification/channelVerification.routes.js";
import { mediaReadRoutes } from "./modules/media/media.read.routes.js";
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
app.use("/api/v1/users", apiLimiter, userRoutes);
app.use("/api/v1/follows", apiLimiter, followRoutes);
// Media manages its own limits per route (like auth): the strict mint limiter
// on /grants, the general limiter on ingest — no blanket prefix limiter.
app.use("/api/v1/media", mediaRoutes);
// Channel verification likewise carries a limiter per route, sized for what each
// one costs: issuing spends mail, confirming is typed by hand.
app.use("/api/v1/channel-verification", channelVerificationRoutes);

// ─── Media Read (top-level, outside /api/v1 — a stable, embeddable public URL) ─
app.use("/media", mediaReadRoutes);

// ─── Error Handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);
