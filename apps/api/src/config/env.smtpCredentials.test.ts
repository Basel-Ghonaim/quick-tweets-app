/**
 * Selecting a transport without its settings must stop the boot, not the first
 * send.
 *
 * The requirement is conditional on purpose: the non-delivering backends need no
 * credentials, so demanding them from a developer running inert would be noise.
 * That conditionality is exactly what makes the guarantee worth asserting — a
 * blanket `required()` would be visible in the schema, whereas this one lives in
 * a refine that only fires for one value of another field.
 *
 * The schema is re-imported per case because it validates at module load, which
 * is the point: the failure has to reach a boot.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV = { ...process.env };

/** A configuration that parses, so each case varies one thing against a valid base. */
const BASE: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db?schema=public",
  JWT_SECRET: "a-secret-of-at-least-16-chars",
};

const CREDENTIALS: Record<string, string> = {
  SMTP_HOST: "smtp.example.test",
  SMTP_USER: "sender@example.test",
  SMTP_PASSWORD: "an-app-password",
  MAIL_FROM: "quick-tweets <sender@example.test>",
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

describe("smtp without its settings is refused at startup", () => {
  for (const missing of Object.keys(CREDENTIALS)) {
    it(`refuses when ${missing} is absent`, async () => {
      await expect(
        loadEnvWith({ MAIL_MODE: "smtp", ...CREDENTIALS, [missing]: undefined }),
      ).rejects.toThrow(new RegExp(missing));
    });

    it(`refuses when ${missing} is present but empty`, async () => {
      await expect(
        loadEnvWith({ MAIL_MODE: "smtp", ...CREDENTIALS, [missing]: "" }),
      ).rejects.toThrow(new RegExp(missing));
    });
  }

  it("parses once every setting is supplied", async () => {
    const { env } = await loadEnvWith({ MAIL_MODE: "smtp", ...CREDENTIALS });

    expect(env.MAIL_MODE).toBe("smtp");
    expect(env.SMTP_HOST).toBe(CREDENTIALS.SMTP_HOST);
  });
});

describe("the non-delivering backends stay credential-free", () => {
  for (const mode of ["inert", "capture"]) {
    it(`parses with no transport settings under ${mode}`, async () => {
      const { env } = await loadEnvWith({ MAIL_MODE: mode });

      expect(env.MAIL_MODE).toBe(mode);
      expect(env.SMTP_HOST).toBeUndefined();
    });
  }

  it("parses with no mail configuration at all", async () => {
    const { env } = await loadEnvWith({});

    expect(env.MAIL_MODE).toBe("inert");
  });
});
