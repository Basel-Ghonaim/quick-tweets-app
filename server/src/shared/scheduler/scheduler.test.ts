/**
 * Scheduler — unit tests (fake JobLock, no real timers or database).
 *
 * `runOnce` drives the per-tick logic directly; the interval/shutdown behaviour
 * is covered with vitest fake timers. Every M10 guarantee has a test:
 * single-run (locked), overlap, failure isolation, release-in-finally, and
 * stop-awaits-in-flight.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { createScheduler, type JobRunLog } from "./scheduler";
import type { JobLock } from "./jobLock";

/** In-memory JobLock. Pre-seed `held` to simulate another instance holding it. */
const makeLock = (held: Set<string> = new Set()) => {
  const releases: string[] = [];
  const lock: JobLock = {
    tryAcquire: async (job) => {
      if (held.has(job)) return false;
      held.add(job);
      return true;
    },
    release: async (job) => {
      held.delete(job);
      releases.push(job);
    },
    close: async () => {},
  };
  return { lock, held, releases };
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("scheduler — runOnce", () => {
  it("runs a job, and acquires then releases its lock", async () => {
    const { lock, held, releases } = makeLock();
    const handler = vi.fn(async () => {});
    const s = createScheduler({ lock, log: () => {} });
    s.register({ name: "job", intervalMs: 1000, handler });

    expect(await s.runOnce("job")).toBe("ran");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(releases).toEqual(["job"]); // released in finally
    expect(held.has("job")).toBe(false);
  });

  it("skips when another instance holds the lock, and does not run the handler", async () => {
    const { lock } = makeLock(new Set(["job"])); // held elsewhere
    const handler = vi.fn(async () => {});
    const s = createScheduler({ lock, log: () => {} });
    s.register({ name: "job", intervalMs: 1000, handler });

    expect(await s.runOnce("job")).toBe("skipped-locked");
    expect(handler).not.toHaveBeenCalled();
  });

  it("isolates a handler failure and still releases the lock", async () => {
    const { lock, held, releases } = makeLock();
    const logs: JobRunLog[] = [];
    const s = createScheduler({ lock, log: (e) => logs.push(e) });
    s.register({ name: "job", intervalMs: 1000, handler: async () => { throw new Error("boom"); } });

    // Does not reject — the failure is isolated.
    expect(await s.runOnce("job")).toBe("errored");
    expect(releases).toEqual(["job"]);       // released despite the throw
    expect(held.has("job")).toBe(false);
    expect(logs.at(-1)?.outcome).toBe("errored");
  });

  it("skips an overlapping run of the same job on the same instance", async () => {
    const { lock } = makeLock();
    const gate = deferred();
    const s = createScheduler({ lock, log: () => {} });
    s.register({ name: "job", intervalMs: 1000, handler: () => gate.promise });

    const first = s.runOnce("job");          // starts, blocks on the gate
    await Promise.resolve();                  // let it reach `running = true`
    const second = await s.runOnce("job");    // overlaps the first
    expect(second).toBe("skipped-overlap");

    gate.resolve();
    expect(await first).toBe("ran");
  });

  it("refuses to register the same job twice", () => {
    const { lock } = makeLock();
    const s = createScheduler({ lock });
    s.register({ name: "job", intervalMs: 1000, handler: async () => {} });
    expect(() => s.register({ name: "job", intervalMs: 2000, handler: async () => {} })).toThrow();
  });
});

describe("scheduler — intervals & shutdown", () => {
  it("runs on the interval and stops running after stop()", async () => {
    vi.useFakeTimers();
    const { lock } = makeLock();
    const handler = vi.fn(async () => {});
    const s = createScheduler({ lock, log: () => {} });
    s.register({ name: "job", intervalMs: 1000, handler });

    s.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(handler).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(handler).toHaveBeenCalledTimes(2);

    await s.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(handler).toHaveBeenCalledTimes(2); // no further runs after stop
  });

  it("stop() waits for an in-flight run before resolving", async () => {
    vi.useFakeTimers();
    const { lock } = makeLock();
    const gate = deferred();
    const s = createScheduler({ lock, log: () => {} });
    s.register({ name: "job", intervalMs: 1000, handler: () => gate.promise });

    s.start();
    await vi.advanceTimersByTimeAsync(1000); // fire the tick; handler now in-flight

    let stopped = false;
    const stopping = s.stop().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false); // stop is waiting for the in-flight job

    gate.resolve();
    await stopping;
    expect(stopped).toBe(true);
  });
});
