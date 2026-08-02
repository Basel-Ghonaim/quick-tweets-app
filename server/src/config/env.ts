/**
 * Environment configuration — type-safe via Zod.
 *
 * Current purpose:
 * - Parses and validates all required environment variables at startup
 * - Fails fast with a clear error if any variable is missing or invalid
 * - Exports a typed `env` object used across the entire backend
 *
 * Security notes:
 * - JWT_EXPIRES_IN defaults to "15m" (not "7d") — short-lived access tokens
 * - NODE_ENV controls cookie secure flag and other production behaviors
 * - CORS_ORIGIN controls allowed frontend origin (no hardcoding)
 *
 * Future expansion:
 * - Add REFRESH_TOKEN_SECRET for refresh token rotation
 * - Add rate limiting config (RATE_LIMIT_WINDOW, RATE_LIMIT_MAX)
 */

import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().default("15m"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    UPLOAD_DIR: z.string().default("./uploads"),
    // Media reclamation (M11). `report` is the FAIL-SAFE default: physical
    // deletion runs only when MEDIA_RECLAMATION_MODE is EXACTLY "destructive"
    // (see resolveReclamationMode) — a missing, empty, mis-cased, or misspelled
    // value resolves to `report`, so bad config can never silently enable
    // deletion. A permissive `string` (not an enum) so an unexpected value warns
    // and stays report rather than crashing. Window/cadence/batch are operational
    // tunables, not architectural invariants.
    MEDIA_RECLAMATION_MODE: z.string().default("report"),
    RECLAMATION_GRACE_MS: z.coerce.number().int().nonnegative().default(24 * 60 * 60 * 1000),
    RECLAMATION_INTERVAL_MS: z.coerce.number().int().positive().default(6 * 60 * 60 * 1000),
    RECLAMATION_BATCH: z.coerce.number().int().positive().default(100),
    // Permissive `string`, not an enum, so an unexpected value warns and stays
    // inert (see resolveMailMode) rather than taking the server down at startup.
    MAIL_MODE: z.string().default("inert"),
    // Crockford base32 — I/L/O/U are absent because the code is typed by hand.
    // 12 characters over 32 symbols is 60 bits, which keeps a fast digest out of
    // offline brute-force range. Configuration, not platform logic.
    CHANNEL_VERIFICATION_CODE_ALPHABET: z
      .string()
      .default("0123456789ABCDEFGHJKMNPQRSTVWXYZ"),
    CHANNEL_VERIFICATION_CODE_LENGTH: z.coerce.number().int().positive().default(12),
    // Covers received-then-typed, not worst-case delivery: a holder who never
    // receives the message waits out the cooldown and asks again, so a longer
    // window would only keep a leaked code useful.
    CHANNEL_VERIFICATION_CHALLENGE_TTL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    // The durable abuse control; the per-IP limiter is only the outer layer.
    CHANNEL_VERIFICATION_RESEND_COOLDOWN_MS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(60 * 1000),
  });

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
