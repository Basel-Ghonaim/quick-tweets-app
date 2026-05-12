/**
 * Express application setup.
 *
 * Purpose:
 * - Creates and configures the Express app instance
 * - Registers global middleware (CORS, JSON parsing, request logger, rate limiting)
 * - Provides a /health endpoint for infrastructure monitoring
 * - Registers the global error handler as the last middleware
 *
 * Future expansion:
 * - Add Multer for file uploads (profile image)
 * - Add helmet for security headers
 * - Add compression middleware for response compression
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authRoutes } from "./modules/auth/auth.routes.js";

export const app = express();

// ─── Proxy Trust ─────────────────────────────────────────────────────────────
// Required for correct IP detection behind reverse proxies (Railway, Render, etc.)
// Without this, rate limiting sees all requests from one IP (the proxy's IP).

app.set("trust proxy", 1);

// ─── Global Middleware ───────────────────────────────────────────────────────

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Feature Routes ──────────────────────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);

// Future module routes (each gets apiLimiter applied):
// app.use("/api/v1/tweets", apiLimiter, tweetRoutes);
// app.use("/api/v1/users", apiLimiter, userRoutes);

// ─── Error Handler (must be last) ────────────────────────────────────────────

app.use(errorHandler);
