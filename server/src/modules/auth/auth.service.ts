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
 *
 * Principle: SRP — only authentication business rules, no HTTP or database concerns.
 * Principle: DIP — depends on repository interfaces, not Prisma directly.
 * Principle: Factory Pattern — createAuthService(...) for DI and testability.
 */

import bcrypt from "bcrypt";
import { AppError } from "../../shared/errors/index.js";
import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import {
  generateAccessToken,
  generateRefreshToken,
  isPrismaError,
} from "../../shared/utils/index.js";
import { createAuthRepository, createTokenRepository } from "./auth.repository.js";
import type {
  AuthResult,
  CreateUserData,
  IAuthRepository,
  IAuthService,
  ITokenRepository,
  LoginInput,
  RegisterInput,
  TokenRefreshResult,
} from "./auth.types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Number of bcrypt salt rounds. 12 = ~250ms per hash — secure yet responsive. */
const SALT_ROUNDS = 12;

/** Refresh token validity period in days. */
const REFRESH_TOKEN_DAYS = 7;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Turn a register-time P2002 into the correct 409. A unique constraint fired
 * despite the advisory pre-check — i.e. a concurrent duplicate committed between
 * the pre-check and our INSERT. We re-query to attribute the collision to the
 * specific field, deliberately NOT parsing the driver-adapter's constraint
 * metadata (its shape is adapter-specific and brittle). Returns the AppError to
 * throw; the combined message is the fallback when the racing row is already
 * gone by the time we re-query.
 */
const attributeRegisterConflict = async (
  authRepo: IAuthRepository,
  data: RegisterInput,
): Promise<AppError> => {
  if (await authRepo.findByUsername(data.username)) {
    return AppError.conflict("Username already taken");
  }
  if (await authRepo.findByEmail(data.email)) {
    return AppError.conflict("Email already in use");
  }
  return AppError.conflict("Username or email is already in use");
};

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Creates an IAuthService with injected dependencies.
 *
 * @param authRepo - User database operations (defaults to Prisma implementation)
 * @param tokenRepo - Refresh token operations (defaults to Prisma implementation)
 * @param runInTransaction - Unit-of-work runner (defaults to the Prisma interactive transaction)
 */
export const createAuthService = (
  authRepo: IAuthRepository = createAuthRepository(),
  tokenRepo: ITokenRepository = createTokenRepository(),
  runInTransaction: RunInTransaction = defaultRunInTransaction,
): IAuthService => ({
  // ─── Register ────────────────────────────────────────────────────────────

  register: async (data: RegisterInput): Promise<AuthResult> => {
    // 1. Advisory uniqueness pre-checks — a fast, clear 409 before any write.
    //    These are not authoritative: the DB unique constraints are, and a
    //    duplicate that races past these checks is caught at step 3 and still
    //    resolves to 409 (never 500).
    const existingUsername = await authRepo.findByUsername(data.username);
    if (existingUsername) {
      throw AppError.conflict("Username already taken");
    }
    const existingEmail = await authRepo.findByEmail(data.email);
    if (existingEmail) {
      throw AppError.conflict("Email already in use");
    }

    // 2. Hash the password and mint the refresh value BEFORE the transaction:
    //    bcrypt is ~250ms and must not hold a database connection/transaction
    //    open, and the refresh value is pure CPU. Registration is account
    //    creation only (ADR 0008 D1): no avatar is coupled to signup.
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const refreshTokenValue = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    const newUser: CreateUserData = {
      username: data.username,
      name: data.name,
      email: data.email,
      passwordHash,
    };

    // 3. Atomic account creation: the User row and its initial refresh session
    //    commit together or roll back together — never a committed account
    //    without its session (a failed session INSERT rolls the account back),
    //    and a duplicate racing past the pre-checks surfaces as P2002, which we
    //    attribute to the specific field by re-querying (no reliance on the
    //    driver-adapter's constraint-metadata shape).
    let user;
    try {
      user = await runInTransaction(async (tx) => {
        const created = await authRepo.create(newUser, tx);
        await tokenRepo.createRefreshToken(created.id, refreshTokenValue, expiresAt, tx);
        return created;
      });
    } catch (err) {
      if (isPrismaError(err, "P2002")) {
        throw await attributeRegisterConflict(authRepo, data);
      }
      throw err;
    }

    // 4. Sign the access token AFTER commit. The signing secret is validated at
    //    startup (env.JWT_SECRET), so this does not fail in practice; and even
    //    if it did, the account and its session are already durably committed —
    //    the user simply logs in. Signing inside the transaction would only
    //    widen it for no benefit.
    const accessToken = generateAccessToken(user.id);

    return { user, accessToken, refreshToken: refreshTokenValue };
  },

  // ─── Login ─────────────────────────────────────────────────────────────────

  login: async (data: LoginInput): Promise<AuthResult> => {
    // 1. Resolve the neutral identifier: trim + lowercase, then route by the '@'
    //    discriminator — an '@' means email (a username can never contain '@'
    //    under the lowercase charset), otherwise username. There is NO fallback
    //    between the two paths, and every miss below yields the same generic 401,
    //    so an unknown username, an unknown email, and a wrong password stay
    //    indistinguishable.
    const identifier = data.identifier.trim().toLowerCase();
    const user = identifier.includes("@")
      ? await authRepo.findByEmail(identifier)
      : await authRepo.findByUsername(identifier);
    if (!user) {
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
});
