/**
 * Auth service — business logic for authentication.
 *
 * Current purpose:
 * - register(): validate uniqueness → hash password → create the account →
 *   generate tokens. Registration is account creation only (ADR 0008 D1): the
 *   avatar is no longer part of signup — it is an authenticated User/Profile
 *   action, so a new account never carries one.
 * - login(): find user → compare password → generate tokens → resolve avatar
 * - logout(): delete refresh token from database
 * - refreshToken(): validate token → rotate (delete old, create new) → return new tokens
 * - getMe(): load the user and resolve its avatar read token
 *
 * Principle: SRP — only authentication business rules, no HTTP or database concerns.
 * Principle: DIP — depends on repository/media interfaces, not Prisma directly.
 * Principle: Factory Pattern — createAuthService(...) for DI and testability.
 */

import bcrypt from "bcrypt";
import { AppError } from "../../shared/errors/index.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../shared/utils/index.js";
import {
  mediaAdoption,
  mediaReferences,
  mediaResolution,
  type IMediaAdoption,
  type IMediaReferences,
  type IMediaResolution,
} from "../media/index.js";
import {
  createAuthRepository,
  createTokenRepository,
} from "./auth.repository.js";
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

// ─── Media port ──────────────────────────────────────────────────────────────

/**
 * The Media surfaces auth consumes, grouped into one injected dependency.
 * Auth actively uses only `resolution` (to display a user's avatar on
 * login/refresh/getMe). The `adoption` and `references` ports are now inert —
 * registration no longer adopts an avatar (ADR 0008 D1) — and are removed when
 * Auth becomes Media-free in WI-6; they are kept here until then so this WI's
 * change stays scoped to de-avataring registration.
 */
export interface AuthMediaPort {
  adoption: IMediaAdoption;
  resolution: IMediaResolution;
  references: IMediaReferences;
}

const defaultMediaPort: AuthMediaPort = {
  adoption: mediaAdoption,
  resolution: mediaResolution,
  references: mediaReferences,
};

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IAuthService with injected dependencies.
 *
 * @param authRepo - User database operations (defaults to Prisma implementation)
 * @param tokenRepo - Refresh token operations (defaults to Prisma implementation)
 * @param media - The Media surfaces auth consumes, grouped so the dependency
 *   list does not grow a parameter per surface (defaults to the published ones)
 */
export const createAuthService = (
  authRepo: IAuthRepository = createAuthRepository(),
  tokenRepo: ITokenRepository = createTokenRepository(),
  media: AuthMediaPort = defaultMediaPort,
): IAuthService => {
  /** Resolve a user's avatar reference to its public read token (null when unset). */
  const resolveAvatar = (referenceId: number | null): Promise<string | null> =>
    referenceId === null
      ? Promise.resolve(null)
      : media.resolution.resolveToken(referenceId);

  return {
    // ─── Register ────────────────────────────────────────────────────────

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

      const newUser: CreateUserData = {
        username: data.username,
        name: data.name,
        email: data.email,
        passwordHash,
      };

      // 4. Create the account. Registration is account creation only (ADR 0008
      //    D1): the avatar is no longer coupled to signup, so there is no
      //    adoption, no reference signal, and no unit-of-work spanning Media —
      //    a new account never carries an avatar.
      const user = await authRepo.create(newUser);

      // 5. Generate tokens.
      const accessToken = generateAccessToken(user.id);
      const refreshTokenValue = generateRefreshToken();

      // 6. Store refresh token (a session artifact — kept outside account
      //    creation so a token-write hiccup cannot undo a valid account).
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
      await tokenRepo.createRefreshToken(user.id, refreshTokenValue, expiresAt);

      return {
        user,
        accessToken,
        refreshToken: refreshTokenValue,
        avatarToken: null,
      };
    },

    // ─── Login ───────────────────────────────────────────────────────────

    login: async (data: LoginInput): Promise<AuthResult> => {
      // 1. Find user by username.
      const user = await authRepo.findByUsername(data.username);
      if (!user) {
        // Generic message — don't reveal whether username exists.
        throw AppError.unauthorized("Invalid credentials");
      }

      // 2. Compare password with stored hash.
      const isPasswordValid = await bcrypt.compare(
        data.password,
        user.passwordHash,
      );
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

      const avatarToken = await resolveAvatar(user.avatarMediaId);
      return {
        user,
        accessToken,
        refreshToken: refreshTokenValue,
        avatarToken,
      };
    },

    // ─── Logout ──────────────────────────────────────────────────────────

    logout: async (refreshToken: string): Promise<void> => {
      // Delete the refresh token — user can no longer refresh, must re-login.
      await tokenRepo.deleteRefreshToken(refreshToken);
    },

    // ─── Logout All Devices ────────────────────────────────────────────────

    logoutAll: async (userId: number): Promise<void> => {
      // Delete ALL refresh tokens for this user — forces re-login on every device.
      await tokenRepo.deleteAllUserTokens(userId);
    },

    // ─── Refresh Token ───────────────────────────────────────────────────

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

      await tokenRepo.rotateRefreshToken(
        token,
        storedToken.userId,
        newRefreshTokenValue,
        expiresAt,
      );

      // Load the user so refresh returns the full session (token + identity),
      // consistent with login/register. See #258.
      const user = await authRepo.findById(storedToken.userId);
      if (!user) {
        throw AppError.unauthorized("Invalid refresh token");
      }

      const avatarToken = await resolveAvatar(user.avatarMediaId);
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenValue,
        user,
        avatarToken,
      };
    },

    // ─── Get Me ────────────────────────────────────────────────────────────

    getMe: async (userId: number): Promise<MeResult> => {
      const user = await authRepo.findById(userId);
      if (!user) {
        throw AppError.notFound("User");
      }
      const avatarToken = await resolveAvatar(user.avatarMediaId);
      return { user, avatarToken };
    },
  };
};
