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

/**
 * Namespaces this mechanism's advisory locks away from every other user of
 * them — the job lock most of all — via the two-key
 * `pg_advisory_xact_lock(int4, int4)` form. (Positive, fits `int4`.)
 */
const LOCK_NAMESPACE = 0x716d6169; // "qmai"

type PrismaInstance = typeof prisma;

export interface ReserveAttemptInput {
  /** Already reduced by `recipientKey` — this layer never sees an address. */
  recipientKey: string;
  /** The start of the rolling window this recipient is counted over. */
  since: Date;
  /** How many attempts the window may contain, this one included. */
  limit: number;
}

/**
 * The module's only data-access path.
 *
 * Every method accepts an optional client so a caller can run it inside an
 * interactive transaction; without one it uses the repository's own.
 */
export interface IMailSendAttemptRepository {
  /**
   * Reserve this recipient's next slot, atomically.
   *
   * Takes a **per-recipient advisory lock**, counts that recipient's attempts
   * inside the window, and records this one only if it fits — returning the new
   * row's id, or `null` when the cap is already met.
   *
   * The lock is what makes the cap a cap. Counting and then inserting without
   * one lets two simultaneous sends both pass a cap of one, and the default
   * isolation level does not save it: neither transaction sees the other's
   * uncommitted row. Contention is per recipient, so sends to different
   * recipients never wait on each other.
   *
   * The row is written before the send, carrying `unknown` — not as a
   * placeholder but because at that moment the outcome genuinely is unknown.
   */
  reserveForRecipient(
    input: ReserveAttemptInput,
    client?: DbClient,
  ): Promise<number | null>;

  /** Correct a reserved attempt once the send has answered. Diagnostic only. */
  setOutcome(id: number, outcome: MailOutcome, client?: DbClient): Promise<void>;

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
  reserveForRecipient: async (
    { recipientKey, since, limit }: ReserveAttemptInput,
    client: DbClient = db,
  ) => {
    const reserve = async (tx: DbClient): Promise<number | null> => {
      // Serialise this recipient for the rest of the transaction. Prisma has no
      // builder for advisory locks, so it is raw; the tagged template binds the
      // key rather than interpolating it. `hashtext` keeps the second key an
      // int4, matching the two-key form the job lock already uses — under a
      // namespace of its own so the two can never collide. `$executeRaw`
      // because the lock returns void, which has no column to deserialise.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}, hashtext(${recipientKey}))`;

      const used = await tx.mailSendAttempt.count({
        where: { recipientKey, createdAt: { gte: since } },
      });
      if (used >= limit) return null;

      // `unknown` is the truth here, not a placeholder: nothing has been sent
      // yet. It is corrected once the send answers, and if this process dies
      // first it stays accurate — and still consumes quota, as it should.
      const row = await tx.mailSendAttempt.create({
        data: { recipientKey, outcome: "unknown" },
        select: { id: true },
      });
      return row.id;
    };

    // The lock is transaction-scoped, so it needs a transaction to be scoped
    // to. A caller already inside one keeps its boundary.
    return client === db
      ? db.$transaction((tx) => reserve(tx as DbClient))
      : reserve(client);
  },

  setOutcome: async (id, outcome, client: DbClient = db) => {
    await client.mailSendAttempt.update({ where: { id }, data: { outcome } });
  },

  countAll: async (since, client: DbClient = db) =>
    client.mailSendAttempt.count({ where: { createdAt: { gte: since } } }),

  deleteBefore: async (cutoff, client: DbClient = db) => {
    const { count } = await client.mailSendAttempt.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  },
});
