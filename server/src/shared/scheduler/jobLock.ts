/**
 * Job lock — cross-instance mutual exclusion for scheduled jobs (M10).
 *
 * A named lock backed by a **session-scoped** Postgres advisory lock. Advisory
 * locks are cluster-wide, so two API instances contending on the same job name
 * resolve to exactly one holder — the multi-instance single-run guarantee.
 *
 * Two deliberate choices (see the M10 Work Item):
 * - **Session-scoped, not transaction-scoped.** An `xact` lock releases only
 *   when its transaction ends, which would force the job handler to run *inside*
 *   a long transaction — unsafe for a job that touches the filesystem (M11
 *   deletes bytes) and a `VACUUM`/pool drag. A session lock is held by explicit
 *   `acquire → release`, decoupled from any transaction, so the handler runs
 *   under none.
 * - **A dedicated connection, never Prisma's pool.** Prisma runs each query on
 *   an arbitrary pooled connection, so an acquire and its release could land on
 *   different sessions and the lock would leak. This holds one dedicated `pg`
 *   connection for locking only.
 *
 * Crash safety falls out for free: a session lock is released automatically
 * when its connection closes, including a process crash — no TTL, no heartbeat.
 */

import pg from "pg";

/**
 * Namespaces this application's job locks away from any other advisory-lock
 * user, via the two-key `pg_advisory_lock(int4, int4)` form: this constant is
 * the first key, `hashtext(jobName)` the second. (Positive, fits `int4`.)
 */
const LOCK_NAMESPACE = 0x71746a6f; // "qtjo"

/** Cross-instance mutual exclusion for a named job. */
export interface JobLock {
  /** Try to acquire `job`'s lock. `true` = acquired (caller must release); `false` = held elsewhere. */
  tryAcquire(job: string): Promise<boolean>;
  /** Release `job`'s lock. A no-op if this holder does not hold it. */
  release(job: string): Promise<void>;
  /** Close the dedicated connection, releasing every lock it still holds. */
  close(): Promise<void>;
}

/**
 * A `JobLock` backed by one dedicated Postgres connection. The connection is
 * opened lazily on first use and reused for every acquire/release, so a lock
 * taken on it can always be released on it.
 */
export const createPostgresJobLock = (
  connectionString: string = process.env.DATABASE_URL ?? "",
): JobLock => {
  const client = new pg.Client({ connectionString });
  let connected: Promise<void> | null = null;
  const ready = (): Promise<void> => (connected ??= client.connect().then(() => undefined));

  return {
    tryAcquire: async (job) => {
      await ready();
      const { rows } = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1, hashtext($2)) AS acquired",
        [LOCK_NAMESPACE, job],
      );
      return rows[0]?.acquired === true;
    },

    release: async (job) => {
      await ready();
      await client.query("SELECT pg_advisory_unlock($1, hashtext($2))", [LOCK_NAMESPACE, job]);
    },

    close: async () => {
      // Only end a connection we actually opened; closing releases its locks.
      if (connected !== null) await client.end();
    },
  };
};
