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

import pg, { type QueryResultRow } from "pg";

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
 * A `JobLock` backed by one dedicated Postgres connection, opened lazily and
 * reused so a lock taken on it can always be released on it.
 *
 * The connection is treated as **disposable**: a long-lived client emits an
 * `'error'` event when its connection drops (DB restart, an idle-connection
 * timeout, a network blip). Without a listener that is an *unhandled* error and
 * crashes the whole process, so the error is absorbed and the dead client is
 * discarded; the next call reconnects. Losing the connection releases its
 * advisory locks anyway, so a job that was holding one simply re-contends on
 * the next tick — correctness is preserved, availability is not sacrificed.
 */
export const createPostgresJobLock = (
  connectionString: string = process.env.DATABASE_URL ?? "",
): JobLock => {
  let client: pg.Client | null = null;
  let connecting: Promise<void> | null = null;

  const connect = (): Promise<void> => {
    const c = new pg.Client({ connectionString });
    // Absorb async connection errors — otherwise an unhandled 'error' crashes
    // the process. Drop the dead client so the next call reconnects.
    c.on("error", (err) => {
      if (client === c) {
        client = null;
        connecting = null;
      }
      console.warn("[jobs] lock connection error — will reconnect", err);
    });
    client = c;
    return c.connect().then(
      () => undefined,
      (err: unknown) => {
        // A failed connect must not be cached forever; reset so the next call retries.
        if (client === c) {
          client = null;
          connecting = null;
        }
        throw err;
      },
    );
  };

  /** Run a query on the live connection, connecting first if needed. */
  const run = async <T extends QueryResultRow>(sql: string, params: unknown[]): Promise<T[]> => {
    connecting ??= connect();
    await connecting;
    if (client === null) throw new Error("job lock connection unavailable");
    const { rows } = await client.query<T>(sql, params);
    return rows;
  };

  return {
    tryAcquire: async (job) => {
      const rows = await run<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1, hashtext($2)) AS acquired",
        [LOCK_NAMESPACE, job],
      );
      return rows[0]?.acquired === true;
    },

    release: async (job) => {
      await run<{ pg_advisory_unlock: boolean }>(
        "SELECT pg_advisory_unlock($1, hashtext($2))",
        [LOCK_NAMESPACE, job],
      );
    },

    close: async () => {
      const c = client;
      client = null;
      connecting = null;
      // Ending releases the connection's locks; tolerate an already-dead client.
      if (c !== null) await c.end().catch(() => undefined);
    },
  };
};
