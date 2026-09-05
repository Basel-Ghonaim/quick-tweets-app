/**
 * Onboarding Journey — the repository, and the capability's only path to the
 * database. Internal: nothing outside Auth reaches it, and the service depends
 * on the interface so its rules stay testable without Postgres.
 *
 * Principle: SRP — queries only. Which phase a set of marks means, and whether
 * a move is legal, are decided above; nothing here reads a mark to make a
 * decision.
 */

import { prisma, type DbClient } from "../../../shared/database/index.js";
import type { IJourneyRepository, JourneyRecord } from "./journey.types.js";

type PrismaInstance = typeof prisma;

interface JourneyRow {
  id: number;
  userId: number;
  profileSettledAt: Date | null;
  codeReachedAt: Date | null;
  closedAt: Date | null;
}

const toRecord = (row: JourneyRow): JourneyRecord => ({
  id: row.id,
  userId: row.userId,
  profileSettledAt: row.profileSettledAt,
  codeReachedAt: row.codeReachedAt,
  closedAt: row.closedAt,
});

/**
 * @param db - Prisma client (defaults to the singleton, injectable for tests)
 */
export const createJourneyRepository = (
  db: PrismaInstance = prisma,
): IJourneyRepository => ({
  create: async (userId, client: DbClient = db) => {
    await client.onboardingJourney.create({ data: { userId } });
  },

  findByUserId: async (userId, client: DbClient = db) => {
    const row = await client.onboardingJourney.findUnique({ where: { userId } });
    return row === null ? null : toRecord(row);
  },

  /**
   * Conditional on the mark still being NULL, and the count is the answer.
   *
   * Two tabs advancing at once both reach this; one matches a row and writes,
   * the other matches none and reports so. That is what makes the record
   * monotonic without a lock — the predicate holds the invariant, not the order
   * the callers happened to arrive in.
   */
  fillMark: async (id, mark, at, client: DbClient = db) => {
    const { count } = await client.onboardingJourney.updateMany({
      where: { id, [mark]: null },
      data: { [mark]: at },
    });
    return count === 1;
  },

  close: async (id, at, reason, client: DbClient = db) => {
    const { count } = await client.onboardingJourney.updateMany({
      where: { id, closedAt: null },
      data: { closedAt: at, closedReason: reason },
    });
    return count === 1;
  },
});
