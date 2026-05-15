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
 * - Add UPLOAD_DIR for file storage path
 * - Add REFRESH_TOKEN_SECRET for refresh token rotation
 * - Add rate limiting config (RATE_LIMIT_WINDOW, RATE_LIMIT_MAX)
 */

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("15m"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
