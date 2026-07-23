/**
 * Auth module type definitions — interfaces and data shapes.
 *
 * Current purpose:
 * - Defines IAuthRepository interface (user database operations)
 * - Defines ITokenRepository interface (refresh token CRUD)
 * - Defines CreateUserData shape for user creation
 * - Defines RefreshTokenRecord shape for token queries
 *
 * Future expansion:
 * - Add UpdateUserData for profile editing
 * - Add PasswordResetToken types for forgot password flow
 *
 * Principle: DIP — the service layer depends on these interfaces, not on Prisma.
 * Principle: ISP — IAuthRepository and ITokenRepository are separate because
 *   user queries and token queries are consumed by different parts of the system.
 */

import type { User, RefreshToken } from "../../generated/prisma/client.js";
import type { DbClient } from "../../shared/database/index.js";

// ─── Data Shapes ─────────────────────────────────────────────────────────────

/** Data required to create a new user (excludes auto-generated fields). */
export interface CreateUserData {
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  // No avatar here: the avatar is a Media Reference filled by *adoption* after
  // the user exists (M6), never a create-time field.
}

/** User without passwordHash — used by /me and other non-auth queries. */
export type UserSafe = Omit<User, "passwordHash">;

/** RefreshToken record as returned from the database. */
export type RefreshTokenRecord = RefreshToken;

/**
 * Grant evidence a registrant submits to adopt a pre-uploaded avatar (ADR 0007):
 * the object's read token plus the upload grant that ingested it. Both are
 * required together; adoption verifies and binds them (Media owns the rules).
 */
export interface AvatarEvidence {
  token: string;
  grant: string;
}

// ─── Repository Interfaces ──────────────────────────────────────────────────

/**
 * IAuthRepository — user database operations.
 *
 * Consumed by: AuthService (Step 2)
 * Implemented by: createAuthRepository (auth.repository.ts)
 */
export interface IAuthRepository {
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<UserSafe | null>;
  /** Create a user; runs in `client` when part of a transaction (register-with-avatar). */
  create(data: CreateUserData, client?: DbClient): Promise<User>;
  /**
   * Link a user to its avatar Media Reference (M6). Runs in the caller's `client`
   * so it commits or rolls back atomically with user-create + adoption.
   */
  setAvatarReference(userId: number, referenceId: number, client?: DbClient): Promise<void>;
}

/**
 * ITokenRepository — refresh token CRUD operations.
 *
 * Consumed by: AuthService (Step 2) for token rotation and logout
 * Implemented by: createTokenRepository (auth.repository.ts)
 */
export interface ITokenRepository {
  createRefreshToken(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<RefreshToken>;
  findRefreshToken(token: string): Promise<RefreshTokenRecord | null>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllUserTokens(userId: number): Promise<void>;
  /** Delete every refresh token whose `expiresAt` is before `now`; returns the count removed. */
  deleteExpired(now: Date): Promise<number>;
  rotateRefreshToken(
    oldToken: string,
    userId: number,
    newToken: string,
    expiresAt: Date,
  ): Promise<RefreshToken>;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/** Result returned by register and login operations. */
export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** The user's avatar public read token, resolved from its reference — or null. */
  avatarToken: string | null;
}

/** Result returned by token refresh operations. */
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  user: UserSafe;
  /** The user's avatar public read token, resolved from its reference — or null. */
  avatarToken: string | null;
}

/** The authenticated user's own profile view (`GET /me`), avatar resolved. */
export interface MeResult {
  user: UserSafe;
  avatarToken: string | null;
}

/** Login credentials received from the client. */
export interface LoginInput {
  username: string;
  password: string;
}

/** Registration data received from the client. */
export interface RegisterInput {
  username: string;
  name: string;
  email: string;
  password: string;
  /** Optional avatar to adopt onto the new account (grant evidence; ADR 0007). */
  avatar?: AvatarEvidence;
}

/**
 * IAuthService — authentication business logic.
 *
 * Consumed by: AuthController (Step 3)
 * Implemented by: createAuthService (auth.service.ts)
 */
export interface IAuthService {
  register(data: RegisterInput): Promise<AuthResult>;
  login(data: LoginInput): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  logoutAll(userId: number): Promise<void>;
  refreshToken(token: string): Promise<TokenRefreshResult>;
  getMe(userId: number): Promise<MeResult>;
}
