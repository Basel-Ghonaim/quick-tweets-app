/**
 * Auth repository — Prisma implementation of IAuthRepository and ITokenRepository.
 *
 * Current purpose:
 * - Implements user database queries (find, create) via Prisma
 * - Implements refresh token CRUD (create, find, delete) via Prisma
 * - Uses factory functions with default parameter injection for testability
 *
 * Future expansion:
 * - Add updateUser for profile editing
 * - Add findByEmail for password reset flow
 * - Add soft-delete support (mark as deleted instead of removing)
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: LSP — can be swapped for any implementation that fulfills the interfaces.
 * Principle: Factory Pattern — createAuthRepository(db?) enables mock injection in tests.
 */

import { prisma } from "../../shared/database/index.js";
import type {
  IAuthRepository,
  ITokenRepository,
  CreateUserData,
} from "./auth.types.js";

type PrismaInstance = typeof prisma;

// ─── Safe Select (excludes passwordHash) ─────────────────────────────────────

/**
 * User fields safe for non-auth queries (e.g. /me).
 * Defense-in-depth: even if the DTO mapper is bypassed,
 * passwordHash never leaves the database for these queries.
 */
const userSafeSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  profileImage: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Auth Repository ─────────────────────────────────────────────────────────

/**
 * Creates an IAuthRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to singleton, injectable for tests)
 */
export const createAuthRepository = (
  db: PrismaInstance = prisma,
): IAuthRepository => ({
  findByUsername: (username) => db.user.findUnique({ where: { username } }),

  findByEmail: (email) => db.user.findUnique({ where: { email } }),

  findById: (id) =>
    db.user.findUnique({ where: { id }, select: userSafeSelect }),

  create: (data: CreateUserData) => db.user.create({ data }),
});

// ─── Token Repository ────────────────────────────────────────────────────────

/**
 * Creates an ITokenRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to singleton, injectable for tests)
 */
export const createTokenRepository = (
  db: PrismaInstance = prisma,
): ITokenRepository => ({
  createRefreshToken: (userId, token, expiresAt) =>
    db.refreshToken.create({
      data: { userId, token, expiresAt },
    }),

  findRefreshToken: (token) => db.refreshToken.findUnique({ where: { token } }),

  deleteRefreshToken: async (token) => {
    await db.refreshToken.deleteMany({ where: { token } });
  },

  deleteAllUserTokens: async (userId) => {
    await db.refreshToken.deleteMany({ where: { userId } });
  },
});
