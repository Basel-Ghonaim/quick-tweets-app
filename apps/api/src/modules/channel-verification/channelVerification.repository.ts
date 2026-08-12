/**
 * Channel Verification — the repository, and the module's only path to the
 * database. Internal: no barrel publishes it, and callers above depend on the
 * interface so they stay testable without Postgres.
 *
 * Principle: SRP — queries only, no business rules. Whether a challenge has
 * lapsed, whether a resend is allowed, and what a status resolves to are the
 * caller's to decide; nothing here writes a status.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import type {
  Challenge,
  CloseChallengesInput,
  CreateChallengeInput,
  CreateRecordInput,
  IChannelVerificationRepository,
  LockedRecord,
  MarkProvenInput,
  OpenChallenge,
  VerificationRecord,
} from "./channelVerification.types.js";

type PrismaInstance = typeof prisma;

interface RecordRow {
  id: number;
  userId: number;
  endpoint: string;
  provenAt: Date | null;
  lastChallengedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ChallengeRow {
  id: number;
  verificationId: number;
  expiresAt: Date;
  closedAt: Date | null;
  closedReason: string | null;
  createdAt: Date;
}

const toRecord = (row: RecordRow): VerificationRecord => ({
  id: row.id,
  userId: row.userId,
  endpoint: row.endpoint,
  provenAt: row.provenAt,
  lastChallengedAt: row.lastChallengedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toChallenge = (row: ChallengeRow): Challenge => ({
  id: row.id,
  verificationId: row.verificationId,
  expiresAt: row.expiresAt,
  closedAt: row.closedAt,
  closedReason: row.closedReason,
  createdAt: row.createdAt,
});

/**
 * @param db - Prisma client (defaults to the singleton, injectable for tests)
 */
export const createChannelVerificationRepository = (
  db: PrismaInstance = prisma,
): IChannelVerificationRepository => ({
  findRecord: async (userId, endpoint, client: DbClient = db) => {
    const row = await client.channelVerification.findUnique({
      where: { userId_endpoint: { userId, endpoint } },
    });
    return row === null ? null : toRecord(row);
  },

  upsertRecord: async ({ userId, endpoint }: CreateRecordInput, client: DbClient = db) =>
    toRecord(
      await client.channelVerification.upsert({
        where: { userId_endpoint: { userId, endpoint } },
        create: { userId, endpoint },
        update: {},
      }),
    ),

  lockRecord: async (id, client: DbClient = db) => {
    // Prisma has no `FOR UPDATE` builder, so the lock is raw; the tagged
    // template binds `id` as a parameter rather than interpolating it. A single
    // row per transaction, so there is no lock ordering to observe.
    const rows = await client.$queryRaw<LockedRecord[]>`
      SELECT id,
             last_challenged_at AS "lastChallengedAt",
             proven_at          AS "provenAt"
        FROM channel_verifications
       WHERE id = ${id}
         FOR UPDATE`;
    return rows[0] ?? null;
  },

  findRecords: async (subjects, client: DbClient = db) => {
    if (subjects.length === 0) return [];
    const rows = await client.channelVerification.findMany({
      where: { OR: subjects.map(({ userId, endpoint }) => ({ userId, endpoint })) },
    });
    return rows.map(toRecord);
  },

  findOpenChallenges: async (verificationIds, client: DbClient = db) => {
    if (verificationIds.length === 0) return [];
    const rows = await client.channelVerificationChallenge.findMany({
      where: { verificationId: { in: verificationIds }, closedAt: null },
    });
    return rows.map((row) => ({ ...toChallenge(row), secretHash: row.secretHash }));
  },

  findOpenChallenge: async (verificationId, client: DbClient = db) => {
    const row = await client.channelVerificationChallenge.findFirst({
      where: { verificationId, closedAt: null },
    });
    if (row === null) return null;
    const open: OpenChallenge = { ...toChallenge(row), secretHash: row.secretHash };
    return open;
  },

  createChallenge: async (input: CreateChallengeInput, client: DbClient = db) =>
    toChallenge(await client.channelVerificationChallenge.create({ data: input })),

  closeOpenChallenges: async (
    { verificationId, closedAt, reason }: CloseChallengesInput,
    client: DbClient = db,
  ) => {
    const { count } = await client.channelVerificationChallenge.updateMany({
      where: { verificationId, closedAt: null },
      data: { closedAt, closedReason: reason },
    });
    return count;
  },

  closeChallenge: async (id, closedAt, reason, client: DbClient = db) => {
    const { count } = await client.channelVerificationChallenge.updateMany({
      where: { id, closedAt: null },
      data: { closedAt, closedReason: reason },
    });
    return count;
  },

  markProven: async ({ verificationId, provenAt }: MarkProvenInput, client: DbClient = db) => {
    await client.channelVerification.update({
      where: { id: verificationId },
      data: { provenAt },
    });
  },

  touchLastChallenged: async (verificationId, at, client: DbClient = db) => {
    await client.channelVerification.update({
      where: { id: verificationId },
      data: { lastChallengedAt: at },
    });
  },

  deleteSpentChallenges: async (cutoff, client: DbClient = db) => {
    const { count } = await client.channelVerificationChallenge.deleteMany({
      where: {
        OR: [{ closedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }],
      },
    });
    return count;
  },
});
