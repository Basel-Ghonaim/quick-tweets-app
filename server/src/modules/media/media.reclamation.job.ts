/**
 * Media reclamation — the scheduler job (M11).
 *
 * Registers `runReclamation` on the M10 background substrate, beside the
 * refresh-token cleanup job. It runs **report-only** unless the operator has
 * *explicitly and correctly* opted into destruction.
 *
 * FAIL-SAFE DEFAULT: physical deletion is reachable only when
 * `MEDIA_RECLAMATION_MODE` is EXACTLY the string "destructive". A missing, empty,
 * mis-cased ("Destructive"), or misspelled value — anything unexpected — resolves
 * to `report` (and is warned about, never silent). Bad configuration therefore
 * cannot enable deletion; the only path to it is a deliberate, exact opt-in.
 * (Enabling that opt-in is out of scope for this Work Item — see #354.)
 */

import { env } from "../../config/env.js";
import type { JobDefinition } from "../../shared/scheduler/index.js";
import { createStorageAdapter } from "./index.js";
import {
  runReclamation,
  type ReclamationDeps,
  type ReclamationMode,
  type ReclamationReport,
} from "./media.reclamation.js";
import type { StorageAdapter } from "./media.types.js";
import type { IReclamationRepository } from "./media.reclamation.repository.js";

/**
 * Resolve the configured mode with a fail-safe bias to `report`. Only the exact
 * string "destructive" enables the destructive path; everything else — undefined,
 * "", "report", "Destructive", "destructive " (trailing space), "yes" — is
 * `report`, and an *unrecognised* value is warned about so a typo is never silent.
 */
export const resolveReclamationMode = (
  raw: string | undefined,
  warn: (message: string) => void = (m) => console.warn(m),
): ReclamationMode => {
  if (raw === "destructive") return "destructive";
  if (raw !== undefined && raw !== "report") {
    warn(
      `[jobs] MEDIA_RECLAMATION_MODE="${raw}" is not recognised — defaulting to report ` +
        `(physical deletion stays OFF)`,
    );
  }
  return "report";
};

export interface MediaReclamationJobOptions {
  storage?: StorageAdapter;
  repo?: IReclamationRepository;
  mode?: ReclamationMode;
  graceMs?: number;
  batch?: number;
  intervalMs?: number;
  now?: () => Date;
  log?: (message: string) => void;
  /** The pass to run — injectable so the job is testable without a database. */
  run?: (deps: ReclamationDeps) => Promise<ReclamationReport>;
}

export const createMediaReclamationJob = (
  options: MediaReclamationJobOptions = {},
): JobDefinition => {
  const storage = options.storage ?? createStorageAdapter();
  const mode = options.mode ?? resolveReclamationMode(env.MEDIA_RECLAMATION_MODE);
  const graceMs = options.graceMs ?? env.RECLAMATION_GRACE_MS;
  const batch = options.batch ?? env.RECLAMATION_BATCH;
  const intervalMs = options.intervalMs ?? env.RECLAMATION_INTERVAL_MS;
  const log = options.log ?? ((message) => console.log(message));
  const run = options.run ?? runReclamation;

  return {
    name: "media-reclamation",
    intervalMs,
    handler: async () => {
      await run({ storage, repo: options.repo, mode, graceMs, batch, now: options.now, log });
    },
  };
};
