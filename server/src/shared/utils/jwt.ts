/**
 * JWT utility — token generation and verification.
 *
 * Current purpose:
 * - generateAccessToken(userId): creates a signed JWT with short expiry (15min)
 * - generateRefreshToken(): creates a crypto-random UUID for refresh tokens
 * - verifyAccessToken(token): verifies and decodes a JWT, throws AppError on failure
 *
 * Future expansion:
 * - Add token blacklisting check
 * - Add audience/issuer claims for multi-service environments
 * - Add key rotation support
 *
 * Principle: SRP — only handles token operations, no business logic.
 * Principle: DIP — auth service depends on these utilities, not on jsonwebtoken directly.
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../../config/env.js";
import { AppError } from "../errors/index.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: number;
}

// ─── Token Generation ────────────────────────────────────────────────────────

/**
 * Generates a short-lived JWT access token.
 *
 * @param userId - The authenticated user's ID (stored in token payload)
 * @returns Signed JWT string
 *
 * Token contains: { userId } + { exp, iat }
 * Expiry: controlled by JWT_EXPIRES_IN env var (default: 15m)
 */
export const generateAccessToken = (userId: number): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Generates a cryptographically random UUID for use as a refresh token.
 *
 * Unlike JWTs, refresh tokens are opaque — their validity is checked
 * by looking them up in the database, not by decoding them.
 *
 * @returns Random UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export const generateRefreshToken = (): string => {
  return crypto.randomUUID();
};

// ─── Token Verification ──────────────────────────────────────────────────────

/**
 * Verifies and decodes a JWT access token.
 *
 * @param token - The JWT string from the Authorization header
 * @returns Decoded payload containing userId
 * @throws AppError.authentication if token is invalid or expired
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as AccessTokenPayload;
    return decoded;
  } catch {
    throw AppError.authentication("Invalid or expired token");
  }
};
