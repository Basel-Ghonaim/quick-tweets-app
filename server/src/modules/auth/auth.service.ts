/**
 * Auth service — business logic for authentication.
 *
 * Current purpose:
 * - register(): validate uniqueness → hash password → create user (adopting the
 *   avatar atomically when one is submitted) → generate tokens
 * - login(): find user → compare password → generate tokens → resolve avatar
 * - logout(): delete refresh token from database
 * - refreshToken(): validate token → rotate (delete old, create new) → return new tokens
 * - getMe(): load the user and resolve its avatar read token
 *
 * Register-with-avatar (M6 / ADR 0007): when the request carries avatar grant
 * evidence, **create-user + adopt + link + signal run inside one interactive transaction**
 * (Auth owns the unit-of-work; Media owns and enforces the adoption semantics
 * through its published interface). A failed conditional adoption throws and
 * rolls the whole transaction back — never an account without the chosen avatar,
 * never an adopted object without the account. The grant is spent only by a
 * *successful* adoption, so an otherwise-failed registration leaves the object
 * adoptable for a retry with the same reference + grant.
 *
 * Principle: SRP — only authentication business rules, no HTTP or database concerns.
 * Principle: DIP — depends on repository/adoption interfaces, not Prisma directly.
 * Principle: Factory Pattern — createAuthService(...) for DI and testability.
 */

import bcrypt from "bcrypt";
import { AppError } from "../../shared/errors/index.js";
import { generateAccessToken, generateRefreshToken } from "../../shared/utils/index.js";
import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import {
  mediaAdoption,
  mediaResolution,
  mediaReferences,
  MediaAdoptionError,
  type IMediaAdoption,
  type IMediaResolution,
  type IMediaReferences,
} from "../media/index.js";
import type { User } from "../../generated/prisma/client.js";
import { createAuthRepository, createTokenRepository } from "./auth.repository.js";
import type {
  IAuthRepository,
  ITokenRepository,
  IAuthService,
  CreateUserData,
  RegisterInput,
  LoginInput,
  AuthResult,
  TokenRefreshResult,
  MeResult,
} from "./auth.types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Number of bcrypt salt rounds. 12 = ~250ms per hash — secure yet responsive. */
const SALT_ROUNDS = 12;

/** Refresh token validity period in days. */
const REFRESH_TOKEN_DAYS = 7;

// ─── Media port ──────────────────────────────────────────────────────────────

/**
 * The Media surfaces auth consumes, grouped into one injected dependency.
 * Auth needs several of them (adopt an avatar, resolve it for display), and a
 * parameter per surface would make the factory signature grow with every one.
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

/**
 * The referrer tag under which an avatar holds its media reference. Derived
 * from the immutable user id, so an end signal always matches its begin.
 */
const avatarReferrer = (userId: number): string => `user-avatar:${userId}`;

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IAuthService with injected dependencies.
 *
 * @param authRepo - User database operations (defaults to Prisma implementation)
 * @param tokenRepo - Refresh token operations (defaults to Prisma implementation)
 * @param media - The Media surfaces auth consumes, grouped so the dependency
 *   list does not grow a parameter per surface (defaults to the published ones)
 * @param runInTransaction - Interactive-transaction runner (defaults to Prisma's;
 *   injectable so register-with-avatar is testable without a live database)
 */
export const createAuthService = (
  authRepo: IAuthRepository = createAuthRepository(),
  tokenRepo: ITokenRepository = createTokenRepository(),
  media: AuthMediaPort = defaultMediaPort,
  runInTransaction: RunInTransaction = defaultRunInTransaction,
): IAuthService => {
  /** Resolve a user's avatar reference to its public read token (null when unset). */
  const resolveAvatar = (referenceId: number | null): Promise<string | null> =>
    referenceId === null ? Promise.resolve(null) : media.resolution.resolveToken(referenceId);

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

      // 4. Create the user. When an avatar was submitted, adopt it in the SAME
      //    transaction — create-user, adopt, and link the reference commit or
      //    roll back together. A guard failure in adoption throws, rolling back
      //    the user too (fail-loud, no orphan account, no silently-lost avatar).
      let user: User;
      let avatarToken: string | null = null;

      if (data.avatar) {
        const avatar = data.avatar;
        try {
          const outcome = await runInTransaction(async (tx) => {
            const created = await authRepo.create(newUser, tx);
            const adopted = await media.adoption.adopt(
              { token: avatar.token, grant: avatar.grant, ownerId: created.id },
              tx,
            );
            await authRepo.setAvatarReference(created.id, adopted.referenceId, tx);
            // Tell Media the reference exists, in the same transaction as the
            // reference itself. Without this the object looks unreferenced and
            // reclamation would eventually destroy a live avatar.
            await media.references.referenceBegan(
              { mediaId: adopted.referenceId, referrer: avatarReferrer(created.id) },
              tx,
            );
            return { user: { ...created, avatarMediaId: adopted.referenceId }, token: adopted.token };
          });
          user = outcome.user;
          avatarToken = outcome.token;
        } catch (err) {
          // Adoption failed → the whole transaction rolled back (no account
          // created, grant unspent). Map Media's domain error to the reserved
          // HTTP statuses so the client sees a clear failure, never a 500.
          if (err instanceof MediaAdoptionError) {
            throw err.code === "already_adopted"
              ? AppError.conflict("This avatar has already been claimed")
              : AppError.validation("Registration failed", {
                  avatar: ["The selected avatar could not be attached; please re-upload and try again"],
                });
          }
          throw err;
        }
      } else {
        user = await authRepo.create(newUser);
      }

      // 5. Generate tokens.
      const accessToken = generateAccessToken(user.id);
      const refreshTokenValue = generateRefreshToken();

      // 6. Store refresh token (a session artifact — kept outside the account
      //    transaction so a token-write hiccup cannot undo a valid account).
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
      await tokenRepo.createRefreshToken(user.id, refreshTokenValue, expiresAt);

      return { user, accessToken, refreshToken: refreshTokenValue, avatarToken };
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

      const avatarToken = await resolveAvatar(user.avatarMediaId);
      return { user, accessToken, refreshToken: refreshTokenValue, avatarToken };
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
