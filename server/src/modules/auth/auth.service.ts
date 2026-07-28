/**
 * Auth service — business logic for authentication.
 *
 * Auth owns account creation, authentication, and session lifecycle only. It is
 * **Media-free and Profile-free** (ADR 0008 Decision 10): it does not resolve,
 * hydrate, or return avatars. Auth responses carry only token-derived identity;
 * the current-user profile — including the avatar — is served by the User domain
 * (`GET /users/me`).
 *
 * - register(): validate uniqueness → hash password → create the account →
 *   generate tokens. Registration is account creation only (ADR 0008 D1).
 * - login(): find user → compare password → generate tokens
 * - logout(): delete refresh token from database
 * - refreshToken(): validate token → rotate (delete old, create new) → return new tokens
 * - getMe(): load the authenticated user's identity
 *
 * Principle: SRP — only authentication business rules, no HTTP or database concerns.
 * Principle: DIP — depends on repository interfaces, not Prisma directly.
 * Principle: Factory Pattern — createAuthService(...) for DI and testability.
 */

import bcrypt from "bcrypt";
import { AppError } from "../../shared/errors/index.js";
import { generateAccessToken, generateRefreshToken } from "../../shared/utils/index.js";
import { createAuthRepository, createTokenRepository } from "./auth.repository.js";
import type {
  AuthResult,
  CreateUserData,
  IAuthRepository,
  IAuthService,
  ITokenRepository,
  LoginInput,
  MeResult,
  RegisterInput,
  TokenRefreshResult,
} from "./auth.types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Number of bcrypt salt rounds. 12 = ~250ms per hash — secure yet responsive. */
const SALT_ROUNDS = 12;

/** Refresh token validity period in days. */
const REFRESH_TOKEN_DAYS = 7;

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IAuthService with injected dependencies.
 *
 * @param authRepo - User database operations (defaults to Prisma implementation)
 * @param tokenRepo - Refresh token operations (defaults to Prisma implementation)
 */
export const createAuthService = (
  authRepo: IAuthRepository = createAuthRepository(),
  tokenRepo: ITokenRepository = createTokenRepository(),
): IAuthService => ({
  // ─── Register ────────────────────────────────────────────────────────────

  register: async (data: RegisterInput): Promise<AuthResult> => {
    // 1. Check username uniqueness (fast, clear 409 — before any write).
    const existingUsername = await authRepo.findByUsername(data.username);
    if (existingUsername) {
      throw AppError.conflict("Username already taken");
    }

    // 2. Check email uniqueness.
    const existingEmail = await authRepo.findByEmail(data.email);
    if (existingEmail) {
      throw AppError.conflict("Email already in use");
    }

    // 3. Hash password with bcrypt.
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // 4. Create the account. Registration is account creation only (ADR 0008 D1):
    //    no avatar is coupled to signup.
    const newUser: CreateUserData = {
      username: data.username,
      name: data.name,
      email: data.email,
      passwordHash,
    };
    const user = await authRepo.create(newUser);

    // 5. Generate tokens.
    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();

    // 6. Store refresh token.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    await tokenRepo.createRefreshToken(user.id, refreshTokenValue, expiresAt);

    return { user, accessToken, refreshToken: refreshTokenValue };
  },

  // ─── Login ─────────────────────────────────────────────────────────────────

  login: async (data: LoginInput): Promise<AuthResult> => {
    // 1. Find user by username.
    const user = await authRepo.findByUsername(data.username);
    if (!user) {
      // Generic message — don't reveal whether username exists.
      throw AppError.unauthorized("Invalid credentials");
    }

    // 2. Compare password with stored hash.
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // 3. Generate tokens.
    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();

    // 4. Store refresh token in database.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    await tokenRepo.createRefreshToken(user.id, refreshTokenValue, expiresAt);

    return { user, accessToken, refreshToken: refreshTokenValue };
  },

  // ─── Logout ──────────────────────────────────────────────────────────────

  logout: async (refreshToken: string): Promise<void> => {
    // Delete the refresh token — user can no longer refresh, must re-login.
    await tokenRepo.deleteRefreshToken(refreshToken);
  },

  // ─── Logout All Devices ────────────────────────────────────────────────────

  logoutAll: async (userId: number): Promise<void> => {
    // Delete ALL refresh tokens for this user — forces re-login on every device.
    await tokenRepo.deleteAllUserTokens(userId);
  },

  // ─── Refresh Token ───────────────────────────────────────────────────────

  refreshToken: async (token: string): Promise<TokenRefreshResult> => {
    // 1. Find the refresh token in database.
    const storedToken = await tokenRepo.findRefreshToken(token);
    if (!storedToken) {
      throw AppError.unauthorized("Invalid refresh token");
    }

    // 2. Check if token has expired.
    if (new Date() > storedToken.expiresAt) {
      await tokenRepo.deleteRefreshToken(token);
      throw AppError.unauthorized("Refresh token expired");
    }

    // 3. Atomic token rotation: delete old + create new in one transaction.
    const newAccessToken = generateAccessToken(storedToken.userId);
    const newRefreshTokenValue = generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    await tokenRepo.rotateRefreshToken(token, storedToken.userId, newRefreshTokenValue, expiresAt);

    // Load the user so refresh returns the full session (token + identity).
    const user = await authRepo.findById(storedToken.userId);
    if (!user) {
      throw AppError.unauthorized("Invalid refresh token");
    }

    return { accessToken: newAccessToken, refreshToken: newRefreshTokenValue, user };
  },

  // ─── Get Me ──────────────────────────────────────────────────────────────

  getMe: async (userId: number): Promise<MeResult> => {
    const user = await authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound("User");
    }
    return { user };
  },
});
