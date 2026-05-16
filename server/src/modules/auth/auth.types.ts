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

// ─── Data Shapes ─────────────────────────────────────────────────────────────

/** Data required to create a new user (excludes auto-generated fields). */
export interface CreateUserData {
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  profileImage?: string | null;
}

/** User without passwordHash — used by /me and other non-auth queries. */
export type UserSafe = Omit<User, "passwordHash">;

/** RefreshToken record as returned from the database. */
export type RefreshTokenRecord = RefreshToken;

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
  create(data: CreateUserData): Promise<User>;
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
}

// ─── Service Interface ───────────────────────────────────────────────────────

/** Result returned by register and login operations. */
export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** Result returned by token refresh operations. */
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
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
  profileImage?: string | null;
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
  refreshToken(token: string): Promise<TokenRefreshResult>;
  getMe(userId: number): Promise<UserSafe>;
}
