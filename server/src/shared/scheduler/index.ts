/**
 * Scheduler substrate — the module's published surface (M10).
 *
 * A generic background-execution mechanism: register named jobs, run them on an
 * interval with cross-instance single-run (advisory lock), per-instance overlap
 * protection, and failure isolation. Consumed by features (refresh-token
 * cleanup; later, Media reclamation) — it holds no domain knowledge.
 */

export { createScheduler } from "./scheduler.js";
export type {
  Scheduler,
  JobDefinition,
  JobOutcome,
  JobRunLog,
  SchedulerDeps,
} from "./scheduler.js";
export { createPostgresJobLock } from "./jobLock.js";
export type { JobLock } from "./jobLock.js";
