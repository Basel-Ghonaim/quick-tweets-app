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

// ─── Edit Limiter (per account) ──────────────────────────────────────────────

/**
 * Keyed on the account, not the address: an edit is always signed in, and moving
 * address must not buy more edits. It must run after authGuard, which supplies it.
 */
export const editLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `edit:${req.userId}`,
  message: {
    success: false,
    error: {
      type: "edit_rate_limit",
      message: "You have edited posts too often. Please wait and try again later.",
    },
  },
});

// ─── Channel Verification Limiters ───────────────────────────────────────────

/**
 * Issuing a challenge sends mail, so this guards spend and sender reputation
 * rather than secrecy. The durable control is the per-address cooldown the
 * capability enforces; this is only the outer, per-IP layer.
 *
 * Applied to: POST /channel-verification/challenges
 * Limit: 10 requests per 15 minutes per IP
 */
export const verificationIssueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message: "Too many verification requests. Please wait 15 minutes before trying again.",
    },
  },
});

/**
 * Confirming is not the control against guessing — a single-use code of this
 * length is out of brute-force reach regardless of this limiter. It is sized for
 * people mistyping, not attackers: these limiters are per-IP and in-memory, so a
 * shared egress pools attempts across unrelated users, and too tight a budget
 * locks out strangers for a threat the entropy already answers.
 *
 * Applied to: POST /channel-verification/challenges/confirm
 * Limit: 10 requests per 15 minutes per IP
 */
export const verificationConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message: "Too many confirmation attempts. Please wait 15 minutes before trying again.",
    },
  },
});

// ─── Password Reset Limiters ─────────────────────────────────────────────────
// Tighter than the channel-verification pair above, and the reason is the
// actor rather than the operation: those endpoints sit behind `authGuard`, so
// an attacker must hold a session to reach them at all. These are anonymous.

/**
 * Requesting a reset sends mail to an address the caller chose, which makes it
 * the effort's only unauthenticated path to someone else's inbox.
 *
 * Two durable controls sit beneath this one and are the real answer: the
 * per-account resend cooldown the capability enforces, and Delivery's
 * per-recipient cap with its reserved recovery floor. This limiter is the
 * cheap outer layer — per-IP and in-memory, so it cannot stop one address
 * being targeted from rotating IPs, which is precisely why it is not what the
 * abuse posture rests on.
 *
 * Shared with the resend route, because minting from either is the same act and
 * two budgets would make the real ceiling their sum. Sized for the whole flow
 * rather than for one call: a request plus its resends, and room for the reader
 * who mistyped an address and has to start again.
 *
 * Applied to: POST /auth/password-reset and POST /auth/password-reset/resend
 * Limit: 10 requests per 15 minutes per IP, across both
 */
export const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message: "Too many password reset requests. Please wait 15 minutes before trying again.",
    },
  },
});

/**
 * Checking a code is read-only and cheap, and a 12-character Crockford Base32
 * code is out of brute-force reach whatever this limiter says. It is sized for
 * someone retyping from an inbox on a phone — the actor the alphabet was
 * chosen for — not for an attacker the entropy already answers.
 *
 * Applied to: POST /auth/password-reset/confirm
 * Limit: 10 requests per 15 minutes per IP
 */
export const passwordResetConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message: "Too many attempts. Please wait 15 minutes before trying again.",
    },
  },
});

/**
 * Applying costs a bcrypt hash before the code is even looked at — the same
 * ordering registration uses, so the work is never done while holding a
 * database connection. That makes this the one reset endpoint where a
 * rejected request still costs real CPU, so it is the tightest of the three.
 *
 * Applied to: POST /auth/password-reset/apply
 * Limit: 5 requests per 15 minutes per IP
 */
export const passwordResetApplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: "rate_limit",
      message: "Too many attempts. Please wait 15 minutes before trying again.",
    },
  },
});
