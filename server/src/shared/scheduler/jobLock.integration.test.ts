/**
 * Job lock — integration tests against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration` (needs a reachable DATABASE_URL). These
 * prove the two properties a unit test with a fake cannot: cross-connection
 * contention (the multi-instance single-run guarantee) and automatic release
 * when a connection drops (crash recovery). Excluded from the default unit run
 * because CI has no database.
 */

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
});
