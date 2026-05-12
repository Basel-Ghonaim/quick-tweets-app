/**
 * Rate limiting middleware — protects endpoints from abuse.
 *
 * Purpose:
 * - Prevents brute force attacks on login/register (password guessing)
 * - Limits automated silent refresh calls to a generous threshold
 * - Applies a general rate limit to all API routes
 *
 * Three limiters with different thresholds:
 *   authLimiter    → /login, /register      → 10 req / 15 min (strict)
 *   refreshLimiter → /refresh               → 30 req / 15 min (generous — automated)
 *   apiLimiter     → all other API routes    → 100 req / 15 min (general)
 *
 * Why /refresh is separate:
 *   Silent refresh fires automatically in the background when the access token
 *   expires. If it shared the auth limiter's strict 10-request limit, normal
 *   browsing would exhaust the quota and block the user from logging in.
 *
 * Proxy trust:
 *   app.set("trust proxy", 1) must be set in app.ts for correct IP detection
 *   behind reverse proxies (Railway, Render, Vercel, etc.).
 *
 * Principle: Defense in Depth — multiple layers of protection.
 * Principle: SRP — each limiter has one clear responsibility.
 */

import rateLimit from "express-rate-limit";

// ─── Auth Limiter (login, register) ──────────────────────────────────────────

/**
 * Strict limiter for authentication endpoints.
 * Protects against brute force password attacks.
 *
 * Applied to: POST /auth/login, POST /auth/register
 * Limit: 10 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message:
        "Too many login attempts. For your security, please wait 15 minutes before trying again.",
    },
  },
});

// ─── Refresh Limiter ─────────────────────────────────────────────────────────

/**
 * Generous limiter for token refresh endpoint.
 * Silent refresh runs automatically — needs a higher threshold.
 *
 * Applied to: POST /auth/refresh
 * Limit: 30 requests per 15 minutes per IP
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message:
        "Too many refresh requests. Please wait a few minutes before continuing.",
    },
  },
});

// ─── API Limiter (general) ───────────────────────────────────────────────────

/**
 * General limiter for all API routes.
 * Prevents spam and abuse on tweets, comments, user endpoints.
 *
 * Applied to: /api/v1/* (except auth which has its own limiters)
 * Limit: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message:
        "You have made too many requests. Please slow down and try again in a few minutes.",
    },
  },
});
