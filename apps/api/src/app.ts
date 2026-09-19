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
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authRoutes, mountPasswordReset } from "./modules/auth/auth.routes.js";
import { tweetRoutes } from "./modules/tweets/tweet.routes.js";
import { commentRoutes } from "./modules/comments/comment.routes.js";
import { userRoutes } from "./modules/users/user.routes.js";
import { followRoutes } from "./modules/follows/follow.routes.js";
import { mediaRoutes } from "./modules/media/media.routes.js";
import { channelVerificationRoutes } from "./modules/channel-verification/channelVerification.routes.js";
import {
  channelVerificationProof,
  channelVerificationStatus,
  type VerificationStatus,
} from "./modules/channel-verification/index.js";
import { createJourneyRoutes } from "./modules/auth/journey/journey.routes.js";
import { mediaReadRoutes } from "./modules/media/media.read.routes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { env } from "./config/env.js";
import { resolveCurrentEmail } from "./shared/identity/index.js";
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

/*
 * Recovery produces evidence that an address is controlled and does not import
 * the capability that owns the fact. Here is where the two meet: the report
 * goes to that capability's published command, which decides what the evidence
 * requires — recovery only says what happened.
 */
mountPasswordReset((userId, endpoint) =>
  channelVerificationProof.fromDeliveredCode(userId, endpoint),
);

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

/*
 * The onboarding journey needs two facts Channel Verification owns and does not
 * import it. Here is where the two meet: the address comes from the shared
 * identity helper, exactly as the verification surface resolves its own
 * subject, and the tri-state is narrowed to the questions the journey asks.
 *
 * Behind the prefix limiter rather than per-route ones: neither route spends an
 * external resource nor checks a secret, so neither earns a tighter tier, and a
 * limited prefix is what stops a later route arriving with no limit at all.
 */
const channelStatusOf = async (userId: number): Promise<VerificationStatus | null> => {
  const email = await resolveCurrentEmail(userId);
  // An account that has gone answers neither question, and says so as a miss
  // rather than as an error the journey would have to interpret.
  if (email === null) return null;

  return channelVerificationStatus.statusOf(userId, email);
};

app.use(
  "/api/v1/onboarding",
  apiLimiter,
  createJourneyRoutes({
    hasLiveChallenge: async (userId) => (await channelStatusOf(userId)) === "pending",
    hasProvenChannel: async (userId) => (await channelStatusOf(userId)) === "proven",
  }),
);

// ─── Media Read (top-level, outside /api/v1 — a stable, embeddable public URL) ─
app.use("/media", mediaReadRoutes);

// ─── Error Handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);
