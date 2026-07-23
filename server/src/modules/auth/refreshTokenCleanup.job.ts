/**
 * Refresh-token cleanup — the scheduler's first job (M10).
 *
 * A deliberately **safe** proving workload for the new background-execution
 * substrate: it deletes only *expired* refresh tokens, whose worst-case impact
 * is a forced re-login — not the irreversible byte deletion M11 will later run
 * on the same substrate. Proving the mechanism here first de-risks the
 * destructive job.
 */

import type { JobDefinition } from "../../shared/scheduler/index.js";
import { createTokenRepository } from "./auth.repository.js";
import type { ITokenRepository } from "./auth.types.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

export interface RefreshTokenCleanupOptions {
  repo?: ITokenRepository;
  intervalMs?: number;
  /** Clock, injectable for tests; defaults to the wall clock. */
  now?: () => Date;
  /** Structured sink; defaults to console. */
  log?: (message: string) => void;
}

export const createRefreshTokenCleanupJob = (
  options: RefreshTokenCleanupOptions = {},
): JobDefinition => {
  const repo = options.repo ?? createTokenRepository();
  const now = options.now ?? (() => new Date());
  const log = options.log ?? ((message) => console.log(message));

  return {
    name: "refresh-token-cleanup",
    intervalMs: options.intervalMs ?? ONE_HOUR_MS,
    handler: async () => {
      const removed = await repo.deleteExpired(now());
      // Log every run, including no-op runs, so the job stays observable.
      log(`[jobs] refresh-token-cleanup removed ${removed} expired token(s)`);
    },
  };
};
