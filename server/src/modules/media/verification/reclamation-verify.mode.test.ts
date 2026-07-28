/**
 * Process-scoped mode semantics (WI-B, #375) — a unit suite (no database).
 *
 * Proves, without inventing any live-config mechanism, that the destructive gate
 * is a deliberate, exact, once-captured opt-in:
 * - Fail-safe: only the exact string "destructive" enables the destructive path;
 *   every other value resolves to report.
 * - Captured-once: the job resolves the mode once at creation and passes that same
 *   value to every run.
 * - Source guardrail: the job handler never re-reads config per run (no
 *   `process.env`, no re-resolution) — so a mode change requires a restart.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createMediaReclamationJob,
  resolveReclamationMode,
} from "../media.reclamation.job.js";
import type { ReclamationDeps, ReclamationReport } from "../media.reclamation.js";

describe("resolveReclamationMode — fail-safe (only exact 'destructive' enables)", () => {
  const cases: [string | undefined, "report" | "destructive"][] = [
    ["destructive", "destructive"],
    [undefined, "report"],
    ["", "report"],
    ["report", "report"],
    ["Destructive", "report"],
    ["DESTRUCTIVE", "report"],
    ["destructive ", "report"],
    [" destructive", "report"],
    ["yes", "report"],
    ["true", "report"],
    ["1", "report"],
  ];
  for (const [raw, expected] of cases) {
    it(`${JSON.stringify(raw)} -> ${expected}`, () => {
      expect(resolveReclamationMode(raw, () => {})).toBe(expected);
    });
  }
});

describe("mode is captured once at job creation and used for every run", () => {
  const spyJob = (mode?: "report" | "destructive") => {
    const runs: string[] = [];
    const run = async (deps: ReclamationDeps): Promise<ReclamationReport> => {
      runs.push(deps.mode);
      return { mode: deps.mode } as ReclamationReport;
    };
    const job = createMediaReclamationJob(mode ? { mode, run } : { run });
    return { job, runs };
  };

  it("default (no override) resolves to report and every run observes it", async () => {
    const { job, runs } = spyJob();
    await job.handler();
    await job.handler();
    await job.handler();
    expect(runs).toEqual(["report", "report", "report"]);
  });

  it("an explicit creation-time mode is carried unchanged to every run (captured, not re-resolved)", async () => {
    const { job, runs } = spyJob("destructive"); // fake `run` — no real reclamation happens
    await job.handler();
    await job.handler();
    expect(runs).toEqual(["destructive", "destructive"]);
  });
});

describe("source guardrail — the job handler never re-reads config per run", () => {
  it("the handler body reads no process.env and re-resolves no mode", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(path.join(here, "..", "media.reclamation.job.ts"), "utf8");
    const handler = /handler:\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},/.exec(source);
    expect(handler, "could not locate the job handler body").not.toBeNull();
    const body = handler![1]!;
    expect(body).not.toMatch(/process\.env/);
    expect(body).not.toMatch(/resolveReclamationMode/);
    expect(body).not.toMatch(/MEDIA_RECLAMATION_MODE/);
  });
});
