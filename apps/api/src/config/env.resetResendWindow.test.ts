/**
 * A cooldown at or beyond the code's lifetime names a moment the position has
 * already lapsed past, so the control it reports could never be reached.
 *
 * The schema is re-imported per case because it validates at module load,
 * which is the whole point: the failure has to reach a boot.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV = { ...process.env };

const BASE: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db?schema=public",
  JWT_SECRET: "a-secret-of-at-least-16-chars",
};

const loadEnvWith = async (over: Record<string, string | undefined>) => {
  vi.resetModules();
  process.env = { ...ENV, ...BASE, ...over } as NodeJS.ProcessEnv;
  return import("./env.js");
};

beforeEach(() => vi.resetModules());
afterEach(() => {
  process.env = { ...ENV };
  vi.resetModules();
});

describe("a cooldown the position cannot outlive is refused at startup", () => {
  it("refuses a cooldown longer than the code's lifetime", async () => {
    await expect(
      loadEnvWith({ RESET_CODE_TTL_MS: "60000", RESET_RESEND_COOLDOWN_MS: "120000" }),
    ).rejects.toThrow(/never reach the control/i);
  });

  // Equal is refused too: the window would open at the instant the position
  // lapsed, which is a control no reader can ever use.
  it("refuses a cooldown exactly equal to the code's lifetime", async () => {
    await expect(
      loadEnvWith({ RESET_CODE_TTL_MS: "60000", RESET_RESEND_COOLDOWN_MS: "60000" }),
    ).rejects.toThrow(/RESET_RESEND_COOLDOWN_MS/);
  });

  it("is refused rather than quietly shortened to fit", async () => {
    await expect(
      loadEnvWith({ RESET_CODE_TTL_MS: "60000", RESET_RESEND_COOLDOWN_MS: "120000" }),
    ).rejects.toThrow();
  });
});

describe("a cooldown the position outlives is accepted", () => {
  it("accepts the defaults, so a copied template still boots", async () => {
    const { env } = await loadEnvWith({});

    expect(env.RESET_RESEND_COOLDOWN_MS).toBeLessThan(env.RESET_CODE_TTL_MS);
  });

  it("accepts a cooldown comfortably inside the lifetime", async () => {
    const { env } = await loadEnvWith({
      RESET_CODE_TTL_MS: "600000",
      RESET_RESEND_COOLDOWN_MS: "60000",
    });

    expect(env.RESET_RESEND_COOLDOWN_MS).toBe(60000);
  });
});

describe("the bound on how many times one position may ask", () => {
  it("defaults to a value an operator did not have to set", async () => {
    const { env } = await loadEnvWith({});

    expect(env.RESET_MAX_RESENDS).toBe(3);
  });

  // Zero is a legitimate posture — no resend at all — so it parses rather
  // than being refused as though it were a mistake.
  it("accepts zero, which is a position that may never ask again", async () => {
    const { env } = await loadEnvWith({ RESET_MAX_RESENDS: "0" });

    expect(env.RESET_MAX_RESENDS).toBe(0);
  });

  it("refuses a negative bound", async () => {
    await expect(loadEnvWith({ RESET_MAX_RESENDS: "-1" })).rejects.toThrow();
  });
});
