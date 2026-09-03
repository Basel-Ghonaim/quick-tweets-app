/**
 * The reserve exists only while one number stays smaller than the other.
 *
 * MAIL_RECIPIENT_CAP is the reserved ceiling; MAIL_RECIPIENT_CAP_GENERAL is
 * what every non-reserved consumer is admitted under. If the general limit
 * ever reaches the reserved one, every consumer is admitted under the same
 * number and the gap the reserved consumer depends on has quietly closed —
 * the same class of silent under-enforcement the retention guard exists to
 * catch, applied to this pair instead.
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

describe("a general limit that does not leave a reserve is refused at startup", () => {
  it("refuses when the general limit equals the reserved one", async () => {
    await expect(
      loadEnvWith({
        MAIL_RECIPIENT_CAP: "20",
        MAIL_RECIPIENT_CAP_GENERAL: "20",
      }),
    ).rejects.toThrow(/MAIL_RECIPIENT_CAP_GENERAL/);
  });

  it("refuses when the general limit exceeds the reserved one", async () => {
    await expect(
      loadEnvWith({
        MAIL_RECIPIENT_CAP: "20",
        MAIL_RECIPIENT_CAP_GENERAL: "25",
      }),
    ).rejects.toThrow(/MAIL_RECIPIENT_CAP_GENERAL/);
  });

  it("is refused rather than quietly clamped to fit", async () => {
    // A clamp would substitute a value nobody chose. The failure is the point.
    await expect(
      loadEnvWith({
        MAIL_RECIPIENT_CAP: "20",
        MAIL_RECIPIENT_CAP_GENERAL: "20",
      }),
    ).rejects.toThrow();
  });
});

describe("a general limit strictly below the reserved one is accepted", () => {
  it("accepts the defaults, so a copied template still boots", async () => {
    const { env } = await loadEnvWith({});

    expect(env.MAIL_RECIPIENT_CAP_GENERAL).toBeLessThan(env.MAIL_RECIPIENT_CAP);
  });

  it("accepts a custom pair that still leaves a gap", async () => {
    const { env } = await loadEnvWith({
      MAIL_RECIPIENT_CAP: "50",
      MAIL_RECIPIENT_CAP_GENERAL: "40",
    });

    expect(env.MAIL_RECIPIENT_CAP).toBe(50);
    expect(env.MAIL_RECIPIENT_CAP_GENERAL).toBe(40);
  });

  it("accepts a gap of exactly one", async () => {
    const { env } = await loadEnvWith({
      MAIL_RECIPIENT_CAP: "20",
      MAIL_RECIPIENT_CAP_GENERAL: "19",
    });

    expect(env.MAIL_RECIPIENT_CAP_GENERAL).toBe(19);
  });
});
