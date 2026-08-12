/**
 * Scheduler — the generic background-execution substrate (M10).
 *
 * Runs registered jobs on a fixed interval, with three guarantees:
 * - **Cross-instance single-run** — each tick acquires the job's `JobLock`
 *   (a cluster-wide advisory lock); if another instance holds it, the tick is
 *   skipped. This is what makes running N API instances safe.
 * - **Per-instance overlap protection** — a job never runs concurrently with
 *   itself on one instance; a tick that fires while the previous run is still
 *   going is skipped.
 * - **Failure isolation** — a handler that throws is caught and logged, never
 *   rethrown, so one job's failure never crashes the process or stops the
 *   scheduler.
 *
 * The handler runs under **no enclosing transaction** — the lock is
 * session-scoped, held around the handler, so a long or filesystem-touching
 * job (M11) owns its own transaction boundaries. The substrate knows nothing
 * about any job's domain.
 */

import { type JobLock } from "./jobLock.js";

/** What one tick of a job did. */
export type JobOutcome = "ran" | "skipped-overlap" | "skipped-locked" | "errored";

/** A job the scheduler runs on an interval. */
export interface JobDefinition {
  name: string;
  intervalMs: number;
  handler: () => Promise<void>;
}

/** One structured run record (observability). */
export interface JobRunLog {
  job: string;
  outcome: JobOutcome;
  durationMs?: number;
  error?: unknown;
}

export interface SchedulerDeps {
  lock: JobLock;
  /** Structured run sink; defaults to console (info for runs/skips, error for failures). */
  log?: (entry: JobRunLog) => void;
  /** Clock for durations; defaults to `Date.now` (injectable for tests). */
  now?: () => number;
}

export interface Scheduler {
  register(job: JobDefinition): void;
  start(): void;
  /** Stop all intervals and await any in-flight run, so shutdown never pulls a job's connection mid-run. */
  stop(): Promise<void>;
  /** Run one tick of a registered job now — used by the interval and by tests. */
  runOnce(name: string): Promise<JobOutcome>;
}

interface Registered extends JobDefinition {
  running: boolean;
  handle: ReturnType<typeof setInterval> | null;
}

const defaultLog = (e: JobRunLog): void => {
  const head = `[jobs] ${e.job} ${e.outcome}`;
  if (e.outcome === "errored") console.error(head, e.error);
  else console.log(e.durationMs === undefined ? head : `${head} (${e.durationMs}ms)`);
};

export const createScheduler = (deps: SchedulerDeps): Scheduler => {
  const { lock } = deps;
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? Date.now;
  const jobs = new Map<string, Registered>();
  const inFlight = new Set<Promise<unknown>>();

  const runOnce = async (name: string): Promise<JobOutcome> => {
    const job = jobs.get(name);
    if (job === undefined) throw new Error(`unknown job: ${name}`);

    // Per-instance overlap guard — never run a job concurrently with itself.
    if (job.running) {
      log({ job: name, outcome: "skipped-overlap" });
      return "skipped-overlap";
    }

    // Cross-instance single-run — another instance already holds this tick.
    if (!(await lock.tryAcquire(name))) {
      log({ job: name, outcome: "skipped-locked" });
      return "skipped-locked";
    }

    job.running = true;
    const started = now();
    try {
      await job.handler();
      log({ job: name, outcome: "ran", durationMs: now() - started });
      return "ran";
    } catch (error) {
      // Failure isolation — log, never rethrow.
      log({ job: name, outcome: "errored", durationMs: now() - started, error });
      return "errored";
    } finally {
      job.running = false;
      // Release must not throw past the tick; a lost release is recovered when
      // the connection eventually drops (session-lock semantics).
      await lock.release(name).catch(() => undefined);
    }
  };

  // Fire-and-forget wrapper for the interval; tracked so `stop` can await it.
  const tick = (name: string): void => {
    const p = runOnce(name).catch(() => undefined);
    inFlight.add(p);
    void p.finally(() => inFlight.delete(p));
  };

  return {
    register: (job) => {
      if (jobs.has(job.name)) throw new Error(`job already registered: ${job.name}`);
      jobs.set(job.name, { ...job, running: false, handle: null });
    },

    start: () => {
      for (const job of jobs.values()) {
        job.handle ??= setInterval(() => tick(job.name), job.intervalMs);
      }
    },

    stop: async () => {
      for (const job of jobs.values()) {
        if (job.handle !== null) {
          clearInterval(job.handle);
          job.handle = null;
        }
      }
      await Promise.all([...inFlight]);
    },

    runOnce,
  };
};
