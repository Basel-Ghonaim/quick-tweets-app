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
import type {
  IJourneyRepository,
  JourneyRecord,
  ProfileOutcome,
} from "./journey.types.js";

type PrismaInstance = typeof prisma;

interface JourneyRow {
  id: number;
  userId: number;
  profileSettledAt: Date | null;
  codeReachedAt: Date | null;
  closedAt: Date | null;
  profileOutcome: string | null;
}

/* The column is text and the database holds it to the two values; narrowing
   here is what stops that vocabulary having to be re-checked further up. */
const toOutcome = (value: string | null): ProfileOutcome | null =>
  value === "saved" || value === "skipped" ? value : null;

const toRecord = (row: JourneyRow): JourneyRecord => ({
  id: row.id,
  userId: row.userId,
  profileSettledAt: row.profileSettledAt,
  codeReachedAt: row.codeReachedAt,
  closedAt: row.closedAt,
  profileOutcome: toOutcome(row.profileOutcome),
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
  settleProfile: async (id, at, outcome, client: DbClient = db) => {
    const { count } = await client.onboardingJourney.updateMany({
      where: { id, profileSettledAt: null },
      // One write, so the mark and the outcome cannot come apart.
      data: { profileSettledAt: at, profileOutcome: outcome },
    });
    return count === 1;
  },

  reachCode: async (id, at, client: DbClient = db) => {
    const { count } = await client.onboardingJourney.updateMany({
      where: { id, codeReachedAt: null },
      data: { codeReachedAt: at },
    });
    return count === 1;
  },

  close: async (id, at, reason, outcome, client: DbClient = db) => {
    const { count } = await client.onboardingJourney.updateMany({
      where: { id, closedAt: null },
      // One write, so a closed journey cannot lack either fact about its end.
      data: { closedAt: at, closedReason: reason, verificationOutcome: outcome },
    });
    return count === 1;
  },
});
