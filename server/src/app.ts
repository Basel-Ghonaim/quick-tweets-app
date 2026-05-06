/**
 * Express application setup.
 *
 * Current purpose:
 * - Creates and configures the Express app instance
 * - Registers global middleware (CORS, JSON parsing, request logger)
 * - Provides a /health endpoint for infrastructure monitoring
 * - Registers the global error handler as the last middleware
 *
 * Future expansion:
 * - Add Multer for file uploads (profile image)
 * - Add rate limiting middleware
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

// ─── Global Middleware ───────────────────────────────────────────────────────

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Feature Routes ──────────────────────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);

// Future module routes:
// app.use("/api/v1/posts", postRoutes);
// app.use("/api/v1/comments", commentRoutes);

// ─── Error Handler (must be last) ────────────────────────────────────────────

app.use(errorHandler);
