/**
 * Channel Verification — the spent-challenge sweep.
 *
 * Hygiene, not correctness: status is derived, so an expired challenge reads as
 * expired whether or not this has ever run. Disabling it changes no answer the
 * system gives — only how long the diagnostic trail survives.
 *
 * It removes challenges and nothing else. `provenAt` lives on the record and
 * must outlive every challenge that produced it, and a record left moot by a
 * changed endpoint is evidence rather than garbage.
 */

import { env } from "../../config/env.js";
import type { JobDefinition } from "../../shared/scheduler/index.js";
import { createChannelVerificationRepository } from "./channelVerification.repository.js";
import type { IChannelVerificationRepository } from "./channelVerification.types.js";

export interface ChannelVerificationSweepOptions {
  repo?: IChannelVerificationRepository;
  intervalMs?: number;
  retentionMs?: number;
  /** Clock, injectable for tests; defaults to the wall clock. */
  now?: () => Date;
  /** Structured sink; defaults to console. */
  log?: (message: string) => void;
}

export const createChannelVerificationSweepJob = (
  options: ChannelVerificationSweepOptions = {},
): JobDefinition => {
  const repo = options.repo ?? createChannelVerificationRepository();
  const retentionMs = options.retentionMs ?? env.CHANNEL_VERIFICATION_CHALLENGE_RETENTION_MS;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? ((message: string) => console.log(message));

  return {
    name: "channel-verification-sweep",
    intervalMs: options.intervalMs ?? env.CHANNEL_VERIFICATION_SWEEP_INTERVAL_MS,
    handler: async () => {
      const cutoff = new Date(now().getTime() - retentionMs);
      const removed = await repo.deleteSpentChallenges(cutoff);
      // Log every run, including no-op runs, so the job stays observable.
      log(`[jobs] channel-verification-sweep removed ${removed} spent challenge(s)`);
    },
  };
};
