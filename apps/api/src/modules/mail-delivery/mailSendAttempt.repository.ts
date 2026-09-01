/**
 * Mail Delivery — the send-attempt repository, and the module's only path to the
 * database.
 *
 * Internal: no barrel publishes it, and the controls above depend on the
 * interface so they stay testable without Postgres.
 *
 * Principle: SRP — queries only, no business rules. Which window applies, what a
 * limit is, and whether an attempt may proceed are the controls' to decide;
 * nothing here compares a count to anything.
 */

import { prisma, type DbClient } from "../../shared/database/index.js";
import type { MailOutcome } from "./mail.types.js";

type PrismaInstance = typeof prisma;

export interface RecordAttemptInput {
  /** Already reduced by `recipientKey` — this layer never sees an address. */
  recipientKey: string;
  /** Diagnostic only. Never read back for a decision. */
  outcome: MailOutcome;
}

/**
 * The module's only data-access path.
 *
 * Every method accepts an optional client so a caller can run it inside an
 * interactive transaction; without one it uses the repository's own.
 */
export interface IMailSendAttemptRepository {
  /** Record one attempt. Counted whatever its outcome, per ADR 0015 Decision 4. */
  record(input: RecordAttemptInput, client?: DbClient): Promise<void>;

  /**
   * How many attempts reached one recipient at or after `since` — the
   * per-recipient window.
   */
  countForRecipient(recipientKey: string, since: Date, client?: DbClient): Promise<number>;

  /**
   * How many attempts were made in total at or after `since` — the global
   * ceiling's window, which is this same question with the recipient dropped.
   */
  countAll(since: Date, client?: DbClient): Promise<number>;

  /**
   * Removes attempts older than `cutoff`; returns how many went.
   *
   * Declared here rather than by the job that calls it, because the pruning job
   * reaches the database through the repository like every other caller — the
   * shape the challenge sweep already follows. It is hygiene: no answer the
   * controls give depends on it having run, only on how far back they can see.
   */
  deleteBefore(cutoff: Date, client?: DbClient): Promise<number>;
}

/**
 * @param db - Prisma client (defaults to the singleton, injectable for tests)
 */
export const createMailSendAttemptRepository = (
  db: PrismaInstance = prisma,
): IMailSendAttemptRepository => ({
  record: async ({ recipientKey, outcome }: RecordAttemptInput, client: DbClient = db) => {
    await client.mailSendAttempt.create({ data: { recipientKey, outcome } });
  },

  countForRecipient: async (recipientKey, since, client: DbClient = db) =>
    client.mailSendAttempt.count({
      where: { recipientKey, createdAt: { gte: since } },
    }),

  countAll: async (since, client: DbClient = db) =>
    client.mailSendAttempt.count({ where: { createdAt: { gte: since } } }),

  deleteBefore: async (cutoff, client: DbClient = db) => {
    const { count } = await client.mailSendAttempt.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  },
});
