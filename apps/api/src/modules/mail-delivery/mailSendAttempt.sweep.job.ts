/**
 * Mail Delivery — the spent-attempt sweep.
 *
 * Hygiene, not correctness. The controls count inside their window, so an
 * attempt that has aged out is already irrelevant whether or not anything
 * removed it. Disabling this changes no answer the caps give — only how much of
 * the diagnostic trail survives, and how large the table grows.
 *
 * It can be that relaxed only because retention is guaranteed to cover the
 * longest window: the environment refuses to start otherwise, so this job can
 * never delete a row a cap still counts.
 *
 * It reaches the database through the repository, like every other caller, and
 * adds no query of its own.
 */

import { env } from "../../config/env.js";
import type { JobDefinition } from "../../shared/scheduler/index.js";
import { createMailSendAttemptRepository } from "./mailSendAttempt.repository.js";
import type { IMailSendAttemptRepository } from "./mailSendAttempt.repository.js";

export interface MailSendAttemptSweepOptions {
  repo?: IMailSendAttemptRepository;
  intervalMs?: number;
  retentionMs?: number;
  /** Clock, injectable for tests; defaults to the wall clock. */
  now?: () => Date;
  /** Structured sink; defaults to console. */
  log?: (message: string) => void;
}

export const createMailSendAttemptSweepJob = (
  options: MailSendAttemptSweepOptions = {},
): JobDefinition => {
  const repo = options.repo ?? createMailSendAttemptRepository();
  const retentionMs = options.retentionMs ?? env.MAIL_ATTEMPT_RETENTION_MS;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? ((message: string) => console.log(message));

  return {
    name: "mail-send-attempt-sweep",
    intervalMs: options.intervalMs ?? env.MAIL_ATTEMPT_SWEEP_INTERVAL_MS,
    handler: async () => {
      const cutoff = new Date(now().getTime() - retentionMs);
      const removed = await repo.deleteBefore(cutoff);
      // Every run is logged, including one that removed nothing, so the job
      // stays observable rather than only surfacing when it has work.
      log(`[jobs] mail-send-attempt-sweep removed ${removed} spent attempt(s)`);
    },
  };
};
