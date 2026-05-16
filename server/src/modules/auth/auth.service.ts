/**
 * Auth service — business logic for authentication.
 *
 * Current purpose:
 * - register(): validate uniqueness → hash password → create user → generate tokens
 * - login(): find user → compare password → generate tokens
 * - logout(): delete refresh token from database
 * - refreshToken(): validate token → rotate (delete old, create new) → return new tokens
 *
 * Future expansion:
 * - forgotPassword(): generate reset token → send email
 * - resetPassword(): validate reset token → update password
 * - changePassword(): verify old password → update to new
 * - verifyEmail(): validate email verification token
 *
 * Principle: SRP — only authentication business rules, no HTTP or database concerns.
 * Principle: DIP — depends on IAuthRepository and ITokenRepository interfaces, not Prisma.
 * Principle: Factory Pattern — createAuthService(authRepo, tokenRepo) for DI and testability.
 */

import bcrypt from "bcrypt";
import { AppError } from "../../shared/errors/index.js";
import { generateAccessToken, generateRefreshToken } from "../../shared/utils/index.js";
import { createAuthRepository, createTokenRepository } from "./auth.repository.js";
import type {
  IAuthRepository,
  ITokenRepository,
  IAuthService,
  RegisterInput,
  LoginInput,
  AuthResult,
  TokenRefreshResult,
} from "./auth.types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Number of bcrypt salt rounds. 12 = ~250ms per hash — secure yet responsive. */
const SALT_ROUNDS = 12;

/** Refresh token validity period in days. */
const REFRESH_TOKEN_DAYS = 7;

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IAuthService with injected repository dependencies.
 *
 * @param authRepo - User database operations (defaults to Prisma implementation)
 * @param tokenRepo - Refresh token operations (defaults to Prisma implementation)
 * @returns IAuthService implementation
 *
 * Usage:
 *   const authService = createAuthService();              // production
 *   const authService = createAuthService(mockRepo, ...); // testing
 */
export const createAuthService = (
  authRepo: IAuthRepository = createAuthRepository(),
  tokenRepo: ITokenRepository = createTokenRepository(),
): IAuthService => ({

  // ─── Register ────────────────────────────────────────────────────────

  register: async (data: RegisterInput): Promise<AuthResult> => {
    // 1. Check username uniqueness
    const existingUsername = await authRepo.findByUsername(data.username);
    if (existingUsername) {
      throw AppError.conflict("Username already taken");
    }

    // 2. Check email uniqueness
    const existingEmail = await authRepo.findByEmail(data.email);
    if (existingEmail) {
      throw AppError.conflict("Email already in use");
    }

    // 3. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // 4. Create user in database
    const user = await authRepo.create({
      username: data.username,
      name: data.name,
      email: data.email,
      passwordHash,
      profileImage: data.profileImage ?? null,
    });

    // 5. Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();

    // 6. Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    await tokenRepo.createRefreshToken(user.id, refreshTokenValue, expiresAt);

    return { user, accessToken, refreshToken: refreshTokenValue };
  },

  // ─── Login ───────────────────────────────────────────────────────────

  login: async (data: LoginInput): Promise<AuthResult> => {
    // 1. Find user by username
    const user = await authRepo.findByUsername(data.username);
    if (!user) {
      // Generic message — don't reveal whether username exists
      throw AppError.authentication("Invalid credentials");
    }

    // 2. Compare password with stored hash
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.authentication("Invalid credentials");
    }

    // 3. Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();

    // 4. Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    await tokenRepo.createRefreshToken(user.id, refreshTokenValue, expiresAt);

    return { user, accessToken, refreshToken: refreshTokenValue };
  },

  // ─── Logout ──────────────────────────────────────────────────────────

  logout: async (refreshToken: string): Promise<void> => {
    // Delete the refresh token — user can no longer refresh, must re-login
    await tokenRepo.deleteRefreshToken(refreshToken);
  },

  // ─── Logout All Devices ────────────────────────────────────────────────

  logoutAll: async (userId: number): Promise<void> => {
    // Delete ALL refresh tokens for this user — forces re-login on every device
    await tokenRepo.deleteAllUserTokens(userId);
  },

  // ─── Refresh Token ───────────────────────────────────────────────────

  refreshToken: async (token: string): Promise<TokenRefreshResult> => {
    // 1. Find the refresh token in database
    const storedToken = await tokenRepo.findRefreshToken(token);
    if (!storedToken) {
      throw AppError.authentication("Invalid refresh token");
    }

    // 2. Check if token has expired
    if (new Date() > storedToken.expiresAt) {
      // Clean up expired token
      await tokenRepo.deleteRefreshToken(token);
      throw AppError.authentication("Refresh token expired");
    }

    // 3. Atomic token rotation: delete old + create new in one transaction
    const newAccessToken = generateAccessToken(storedToken.userId);
    const newRefreshTokenValue = generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    await tokenRepo.rotateRefreshToken(
      token,
      storedToken.userId,
      newRefreshTokenValue,
      expiresAt,
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshTokenValue };
  },

  // ─── Get Me ────────────────────────────────────────────────────────────

  getMe: async (userId: number) => {
    const user = await authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound("User");
    }
    return user;
  },
});
