/**
 * Password Reset — the spent-credential sweep.
 *
 * Hygiene, not correctness. Whether a credential is usable is derived from
 * `usedAt` and `expiresAt` at the moment it is read (I8), so an expired one
 * reads as expired whether or not this has ever run. Disabling it changes no
 * answer the system gives — only how long the diagnostic trail survives and
 * how large the table grows.
 *
 * That relaxed posture is earned by one guarantee, and it is enforced in the
 * environment schema rather than here: retention can never fall below the
 * resend cooldown. This capability anchors its cooldown on the table's own
 * most recent row, so a sweep that outran the cooldown would remove a row the
 * next request still needs to see, and a resend inside that window would
 * misread as a first-ever request. The schema refuses that configuration at
 * startup rather than clamping it, so this job never has to defend against it.
 *
 * It reaches the database through the module's repository, like every other
 * caller, and adds no query of its own.
 */

import { env } from "../../../config/env.js";
import type { JobDefinition } from "../../../shared/scheduler/index.js";
import { createPasswordResetRepository } from "./passwordReset.repository.js";
import type { IPasswordResetRepository } from "./passwordReset.types.js";

export interface PasswordResetSweepOptions {
  repo?: IPasswordResetRepository;
  intervalMs?: number;
  retentionMs?: number;
  /** Clock, injectable for tests; defaults to the wall clock. */
  now?: () => Date;
  /** Structured sink; defaults to console. */
  log?: (message: string) => void;
}

export const createPasswordResetSweepJob = (
  options: PasswordResetSweepOptions = {},
): JobDefinition => {
  const repo = options.repo ?? createPasswordResetRepository();
  const retentionMs = options.retentionMs ?? env.RESET_CHALLENGE_RETENTION_MS;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? ((message: string) => console.log(message));

  return {
    name: "password-reset-sweep",
    intervalMs: options.intervalMs ?? env.RESET_CHALLENGE_SWEEP_INTERVAL_MS,
    handler: async () => {
      const cutoff = new Date(now().getTime() - retentionMs);
      const removed = await repo.deleteBefore(cutoff);
      // Every run is logged, no-ops included, so the job stays observable.
      log(`[jobs] password-reset-sweep removed ${removed} spent credential(s)`);
    },
  };
};
