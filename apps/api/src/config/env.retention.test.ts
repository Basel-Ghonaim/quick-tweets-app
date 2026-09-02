/**
 * The one relationship between settings that cannot be left to a reader.
 *
 * Retention and the send windows are separate values, introduced by separate
 * changes, and nothing about either name suggests they are related. If
 * retention is the shorter, the sweep removes attempts a window still counts
 * and the caps under-enforce with no error anywhere — a security control
 * disabled by lowering one number.
 *
 * The schema is re-imported per case because it validates at module load, which
 * is the whole point: the failure has to reach a boot, not a first send.
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

const DAY = 24 * 60 * 60 * 1000;

describe("retention shorter than a send window is refused at startup", () => {
  it("refuses when it is shorter than the recipient window", async () => {
    await expect(
      loadEnvWith({
        MAIL_RECIPIENT_CAP_WINDOW_MS: String(7 * DAY),
        MAIL_OUTBOUND_CEILING_WINDOW_MS: String(DAY),
        MAIL_ATTEMPT_RETENTION_MS: String(DAY),
      }),
    ).rejects.toThrow(/under-enforce/i);
  });

  it("refuses when it is shorter than the ceiling window", async () => {
    await expect(
      loadEnvWith({
        MAIL_RECIPIENT_CAP_WINDOW_MS: String(DAY),
        MAIL_OUTBOUND_CEILING_WINDOW_MS: String(30 * DAY),
        MAIL_ATTEMPT_RETENTION_MS: String(7 * DAY),
      }),
    ).rejects.toThrow(/under-enforce/i);
  });

  it("names the setting an operator has to change", async () => {
    await expect(
      loadEnvWith({
        MAIL_RECIPIENT_CAP_WINDOW_MS: String(7 * DAY),
        MAIL_ATTEMPT_RETENTION_MS: String(DAY),
      }),
    ).rejects.toThrow(/MAIL_ATTEMPT_RETENTION_MS/);
  });

  it("is refused rather than quietly raised to fit", async () => {
    // A clamp would substitute a value nobody chose. The failure is the point.
    await expect(
      loadEnvWith({
        MAIL_RECIPIENT_CAP_WINDOW_MS: String(7 * DAY),
        MAIL_ATTEMPT_RETENTION_MS: String(DAY),
      }),
    ).rejects.toThrow();
  });
});

describe("retention that covers every window is accepted", () => {
  it("accepts retention longer than both", async () => {
    const { env } = await loadEnvWith({
      MAIL_RECIPIENT_CAP_WINDOW_MS: String(DAY),
      MAIL_OUTBOUND_CEILING_WINDOW_MS: String(DAY),
      MAIL_ATTEMPT_RETENTION_MS: String(7 * DAY),
    });

    expect(env.MAIL_ATTEMPT_RETENTION_MS).toBe(7 * DAY);
  });

  it("accepts retention exactly equal to the longest window", async () => {
    // Equal is enough: the sweep removes what is strictly older than the cutoff,
    // and a window includes its edge, so the two meet without a gap.
    const { env } = await loadEnvWith({
      MAIL_RECIPIENT_CAP_WINDOW_MS: String(2 * DAY),
      MAIL_OUTBOUND_CEILING_WINDOW_MS: String(DAY),
      MAIL_ATTEMPT_RETENTION_MS: String(2 * DAY),
    });

    expect(env.MAIL_ATTEMPT_RETENTION_MS).toBe(2 * DAY);
  });

  it("accepts the defaults, so a copied template still boots", async () => {
    const { env } = await loadEnvWith({});

    expect(env.MAIL_ATTEMPT_RETENTION_MS).toBeGreaterThanOrEqual(
      Math.max(env.MAIL_RECIPIENT_CAP_WINDOW_MS, env.MAIL_OUTBOUND_CEILING_WINDOW_MS),
    );
  });
});
