/**
 * Password Reset — the repository, and the module's only path to the
 * database. Internal: not published from Auth's public surface, and the
 * service above depends on the interface so it stays testable without
 * Postgres.
 *
 * Principle: SRP — queries only, no business rules. Whether a row is usable,
 * whether a cooldown is active, and what a resend does are the service's to
 * decide; nothing here compares a timestamp to anything.
 */

import { prisma, type DbClient } from "../../../shared/database/index.js";
import type {
  CreateChallengeInput,
  CreateSessionInput,
  IPasswordResetRepository,
  PasswordResetChallenge,
  PasswordResetChallengeWithHash,
  PasswordResetSession,
} from "./passwordReset.types.js";

/**
 * Namespaces this module's advisory lock away from every other user of them
 * — mail-delivery's recipient lock (0x716d6169) and the scheduler's job lock
 * (0x71746a6f) most of all — via the two-key `pg_advisory_xact_lock(int4,
 * int4)` form. ASCII "prst" (positive, fits int4).
 */
const LOCK_NAMESPACE = 0x70727374;

type PrismaInstance = typeof prisma;

interface ChallengeRow {
  endpoint: string;
  id: number;
  userId: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const toChallenge = (row: ChallengeRow): PasswordResetChallenge => ({
  endpoint: row.endpoint,
  id: row.id,
  userId: row.userId,
  expiresAt: row.expiresAt,
  usedAt: row.usedAt,
  createdAt: row.createdAt,
});

interface SessionRow {
  id: number;
  maskedEndpoint: string;
  challengeId: number | null;
  expiresAt: Date;
}

const toSession = (row: SessionRow): PasswordResetSession => ({
  id: row.id,
  maskedEndpoint: row.maskedEndpoint,
  challengeId: row.challengeId,
  expiresAt: row.expiresAt,
});

/**
 * @param db - Prisma client (defaults to the singleton, injectable for tests)
 */
export const createPasswordResetRepository = (
  db: PrismaInstance = prisma,
): IPasswordResetRepository => ({
  findMostRecentForUser: async (userId, client: DbClient = db) => {
    const row = await client.passwordResetChallenge.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return row === null ? null : toChallenge(row);
  },

  lockUser: async (userId, client: DbClient) => {
    // Prisma has no builder for advisory locks, so this is raw; the tagged
    // template binds userId as a parameter rather than interpolating it. One
    // key per user, so there is no lock ordering to observe.
    await client.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}, ${userId})`;
  },

  createChallenge: async (
    { userId, codeHash, endpoint, expiresAt }: CreateChallengeInput,
    client: DbClient = db,
  ) => toChallenge(await client.passwordResetChallenge.create({ data: { userId, codeHash, endpoint, expiresAt } })),

  findByCodeHash: async (codeHash, client: DbClient = db) => {
    const row = await client.passwordResetChallenge.findUnique({ where: { codeHash } });
    if (row === null) return null;
    const withHash: PasswordResetChallengeWithHash = { ...toChallenge(row), codeHash: row.codeHash };
    return withHash;
  },

  markUsed: async (id, usedAt, client: DbClient = db) => {
    const { count } = await client.passwordResetChallenge.updateMany({
      where: { id, usedAt: null },
      data: { usedAt },
    });
    return count;
  },

  deleteBefore: async (cutoff, client: DbClient = db) => {
    const { count } = await client.passwordResetChallenge.deleteMany({
      where: {
        OR: [{ usedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }],
      },
    });
    return count;
  },

  findChallengeById: async (id, client: DbClient = db) => {
    const row = await client.passwordResetChallenge.findUnique({ where: { id } });
    return row === null ? null : toChallenge(row);
  },

  createSession: async (input: CreateSessionInput, client: DbClient = db) => {
    await client.passwordResetSession.create({ data: input });
  },

  findSessionByTokenHash: async (tokenHash, client: DbClient = db) => {
    const row = await client.passwordResetSession.findUnique({ where: { tokenHash } });
    return row === null ? null : toSession(row);
  },

  deleteSessionByTokenHash: async (tokenHash, client: DbClient = db) => {
    await client.passwordResetSession.deleteMany({ where: { tokenHash } });
  },

  bindSessionToChallenge: async (id, challengeId, client: DbClient = db) => {
    await client.passwordResetSession.update({ where: { id }, data: { challengeId } });
  },

  deleteSessionsBefore: async (cutoff, client: DbClient = db) => {
    const { count } = await client.passwordResetSession.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
    return count;
  },
});
