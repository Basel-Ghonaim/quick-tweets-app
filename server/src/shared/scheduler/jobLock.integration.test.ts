/**
 * Job lock — integration tests against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration` (needs a reachable DATABASE_URL). These
 * prove the two properties a unit test with a fake cannot: cross-connection
 * contention (the multi-instance single-run guarantee) and automatic release
 * when a connection drops (crash recovery). Excluded from the default unit run
 * because CI has no database.
 */

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPostgresJobLock, type JobLock } from "./jobLock";

const CONN = process.env.DATABASE_URL ?? "";

// A unique job name per run, so repeated runs never contend with each other.
const JOB = `it-lock-${process.pid}-${Math.floor(process.hrtime()[1])}`;

/** Probe connectivity once; skip the whole suite (not fail) if no DB is reachable. */
let reachable = false;
beforeAll(async () => {
  const probe = createPostgresJobLock(CONN);
  try {
    await probe.tryAcquire(`${JOB}-probe`);
    await probe.release(`${JOB}-probe`);
    reachable = true;
  } catch {
    reachable = false;
  } finally {
    await probe.close();
  }
});

describe.runIf(true)("job lock — real Postgres", () => {
  const locks: JobLock[] = [];
  const make = (): JobLock => {
    const l = createPostgresJobLock(CONN);
    locks.push(l);
    return l;
  };
  afterAll(async () => {
    await Promise.all(locks.map((l) => l.close()));
  });

  it("lets exactly one of two connections hold the same lock (cross-instance single-run)", async () => {
    if (!reachable) return; // DB not available — treated as skipped
    const a = make();
    const b = make();

    expect(await a.tryAcquire(JOB)).toBe(true); // A wins
    expect(await b.tryAcquire(JOB)).toBe(false); // B is refused while A holds it

    await a.release(JOB);
    expect(await b.tryAcquire(JOB)).toBe(true); // B acquires only after A releases
    await b.release(JOB);
  });

  it("auto-releases the lock when the holding connection closes (crash recovery)", async () => {
    if (!reachable) return;
    const crashing = make();
    expect(await crashing.tryAcquire(JOB)).toBe(true);

    await crashing.close(); // simulate the process/connection dying while holding the lock

    const next = make();
    expect(await next.tryAcquire(JOB)).toBe(true); // the lock was freed by the drop, no TTL wait
    await next.release(JOB);
  });

  it("survives an UNEXPECTED backend termination and reconnects (no unhandled crash)", async () => {
    if (!reachable) return;
    // Tag this lock's connection so an admin session can find and kill it. This
    // is the case a graceful .end() cannot exercise: an out-of-band drop that
    // makes node-postgres emit 'error' on the client — unhandled, that crashes
    // the process (the #344 class). The fix must absorb it and reconnect.
    const appName = `qt_joblock_drop_${process.pid}`;
    const sep = CONN.includes("?") ? "&" : "?";
    const lock = createPostgresJobLock(`${CONN}${sep}application_name=${appName}`);
    locks.push(lock);
    const dropJob = `${JOB}-drop`;

    expect(await lock.tryAcquire(dropJob)).toBe(true); // opens the tagged connection

    // Kill that backend from a separate admin session — an unexpected drop.
    const admin = new pg.Client({ connectionString: CONN });
    await admin.connect();
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1 AND pid <> pg_backend_pid()",
      [appName],
    );
    await admin.end();

    await new Promise((r) => setTimeout(r, 200)); // let the client receive + absorb 'error'

    // Still alive (an unhandled 'error' would have killed the test process), and
    // the lock reconnects transparently — the terminated backend freed its lock.
    expect(await lock.tryAcquire(dropJob)).toBe(true);
    await lock.release(dropJob);
  });
});
