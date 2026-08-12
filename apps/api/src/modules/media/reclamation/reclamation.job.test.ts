/**
 * Media reclamation job — unit tests (no database).
 *
 * The load-bearing test is the FAIL-SAFE default: only the exact string
 * "destructive" enables the destructive path; everything unexpected resolves to
 * `report` (and warns, never silently). The job wiring is tested via an injected
 * `run` seam so no pass touches a database.
 */

import { describe, expect, it, vi } from "vitest";

import { createMediaReclamationJob, resolveReclamationMode } from "./reclamation.job";
import type { ReclamationDeps, ReclamationReport } from "./reclamation";
import type { StorageAdapter } from "../media.types";

const noopStorage = {} as StorageAdapter;
const emptyReport = {} as ReclamationReport;

describe("resolveReclamationMode — fail-safe default", () => {
  it("returns destructive ONLY for the exact string 'destructive'", () => {
    expect(resolveReclamationMode("destructive")).toBe("destructive");
  });

  it("defaults to report for missing / empty / mis-cased / misspelled values", () => {
    const warn = vi.fn();
    for (const raw of [undefined, "", "report", "Destructive", "DESTRUCTIVE", "destructive ", "yes", "true", "1"]) {
      expect(resolveReclamationMode(raw, warn)).toBe("report");
    }
  });

  it("warns (never silently) on an UNRECOGNISED value, but still returns report", () => {
    const warn = vi.fn();

    expect(resolveReclamationMode("destructiv", warn)).toBe("report");

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toContain("destructiv");
  });

  it("does NOT warn for the two expected values or a missing one", () => {
    const warn = vi.fn();

    resolveReclamationMode("report", warn);
    resolveReclamationMode(undefined, warn);
    resolveReclamationMode("destructive", warn);

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("createMediaReclamationJob", () => {
  it("registers as 'media-reclamation' on the configured interval", () => {
    const job = createMediaReclamationJob({ storage: noopStorage, intervalMs: 1234, run: async () => emptyReport });

    expect(job.name).toBe("media-reclamation");
    expect(job.intervalMs).toBe(1234);
  });

  it("runs REPORT mode by default and passes the resolved config through", async () => {
    let received: ReclamationDeps | undefined;
    const job = createMediaReclamationJob({
      storage: noopStorage,
      graceMs: 999,
      batch: 7,
      intervalMs: 10,
      run: async (deps) => { received = deps; return emptyReport; },
    });

    await job.handler();

    expect(received?.mode).toBe("report"); // fail-safe default — destructive stays off
    expect(received?.graceMs).toBe(999);
    expect(received?.batch).toBe(7);
    expect(received?.storage).toBe(noopStorage);
  });

  it("honors an explicit destructive mode option (the only deliberate opt-in)", async () => {
    let received: ReclamationDeps | undefined;
    const job = createMediaReclamationJob({
      storage: noopStorage,
      mode: "destructive",
      run: async (deps) => { received = deps; return emptyReport; },
    });

    await job.handler();

    expect(received?.mode).toBe("destructive");
  });
});
