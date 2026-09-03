/**
 * The reset cooldown depends on retention in a way Channel Verification's
 * never does.
 *
 * Channel Verification anchors its cooldown on its standing record — a row
 * that is never swept — so no retention setting can ever undermine it. Password
 * Reset has no standing record: its cooldown reads the most recent row for a
 * user, so if the sweep could remove that row before the cooldown window
 * closes, a resend arriving in the gap would misread as a first-ever request.
 * This guard is what Password Reset needs and Channel Verification does not.
 *
 * The schema is re-imported per case because it validates at module load,
 * which is the whole point: the failure has to reach a boot.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV = { ...process.env };

/** A configuration that parses, so each case varies one thing against a valid base. */
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

describe("retention shorter than the resend cooldown is refused at startup", () => {
  it("refuses when retention is shorter than the cooldown", async () => {
    await expect(
      loadEnvWith({
        RESET_RESEND_COOLDOWN_MS: "60000",
        RESET_CHALLENGE_RETENTION_MS: "30000",
      }),
    ).rejects.toThrow(/under-enforce/i);
  });

  it("names the setting an operator has to change", async () => {
    await expect(
      loadEnvWith({
        RESET_RESEND_COOLDOWN_MS: "60000",
        RESET_CHALLENGE_RETENTION_MS: "30000",
      }),
    ).rejects.toThrow(/RESET_CHALLENGE_RETENTION_MS/);
  });

  it("is refused rather than quietly raised to fit", async () => {
    // A clamp would substitute a value nobody chose. The failure is the point.
    await expect(
      loadEnvWith({
        RESET_RESEND_COOLDOWN_MS: "60000",
        RESET_CHALLENGE_RETENTION_MS: "30000",
      }),
    ).rejects.toThrow();
  });
});

describe("retention that covers the cooldown is accepted", () => {
  it("accepts the defaults, so a copied template still boots", async () => {
    const { env } = await loadEnvWith({});

    expect(env.RESET_CHALLENGE_RETENTION_MS).toBeGreaterThanOrEqual(
      env.RESET_RESEND_COOLDOWN_MS,
    );
  });

  it("accepts retention exactly equal to the cooldown", async () => {
    const { env } = await loadEnvWith({
      RESET_RESEND_COOLDOWN_MS: "60000",
      RESET_CHALLENGE_RETENTION_MS: "60000",
    });

    expect(env.RESET_CHALLENGE_RETENTION_MS).toBe(60000);
  });

  it("accepts retention comfortably longer than the cooldown", async () => {
    const { env } = await loadEnvWith({
      RESET_RESEND_COOLDOWN_MS: "60000",
      RESET_CHALLENGE_RETENTION_MS: String(7 * 24 * 60 * 60 * 1000),
    });

    expect(env.RESET_CHALLENGE_RETENTION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
