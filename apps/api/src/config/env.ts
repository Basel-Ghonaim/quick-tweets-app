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
    // The SMTP transport. A provider is a host and a credential (ADR 0015
    // Decision 1), so these are all that changes when one is swapped. Optional
    // here and required by the refine below only when `smtp` is selected —
    // demanding credentials from a developer running inert would be noise.
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    // False selects STARTTLS, which the 587 submission port uses.
    SMTP_SECURE: z
      .string()
      .default("false")
      .transform((v) => v === "true"),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    // Providers commonly require this to be the authenticated identity, and
    // rewrite or reject anything else.
    MAIL_FROM: z.string().optional(),
    // Bounds the whole attempt. Without it a hung relay holds an HTTP request
    // open and delays shutdown, since nothing else caps it.
    MAIL_SEND_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
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
    // How often spent challenges are swept (ms; default 6h). Hygiene, not
    // correctness — status is derived, so nothing depends on this having run.
    CHANNEL_VERIFICATION_SWEEP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60 * 1000),
    // How long a spent challenge is kept before removal (ms; default 7d). It
    // buys diagnostics only: the proof lives on the record and is never swept.
    //
    // `positive()` is load-bearing, not tidiness. The sweep deletes where
    // `closed_at < cutoff OR expires_at < cutoff`, and `cutoff = now - this`; a
    // negative value would push the cutoff into the future, where `expires_at <
    // cutoff` starts matching live, unexpired challenges. Rejecting it at
    // startup closes that permanently, with no runtime branch.
    CHANNEL_VERIFICATION_CHALLENGE_RETENTION_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 60 * 60 * 1000),
  })
  // Selecting a transport without the settings it needs is a misconfiguration,
  // and this project refuses to boot on those rather than failing at first use.
  // Scoped to `smtp` so the non-sending modes stay credential-free.
  .superRefine((cfg, ctx) => {
    if (cfg.MAIL_MODE !== "smtp") return;

    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"] as const) {
      if (!cfg[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when MAIL_MODE="smtp"`,
        });
      }
    }
  });

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
