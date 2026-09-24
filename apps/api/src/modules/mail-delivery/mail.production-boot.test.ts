/**
 * "Production refuses to boot" proven where booting actually happens.
 *
 * A resolver test shows the resolver throws. It does not show that the process
 * refuses to start — the resolver could throw into something that swallowed it,
 * and every resolver test would still pass while a misconfigured production
 * came up and silently sent nothing.
 *
 * So this file loads the composition module the way the application does, with
 * the environment a deployment would have, and asserts the failure propagates
 * out of the import. That is the criterion (ADR 0015 Decision 3).
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const ENV = { ...process.env };

/**
 * Import the mail composition module fresh under a given environment.
 *
 * The registry resolves its mode once, at import, so the module cache has to be
 * dropped between cases or the first environment would decide them all.
 */
const importCompositionUnder = async (env: Record<string, string | undefined>) => {
  vi.resetModules();
  process.env = { ...ENV, ...env } as NodeJS.ProcessEnv;
  return import("./index.js");
};

// The first import in a worker loads nodemailer and the database client, far slower than any
// later one; paid here, it cannot time out the first case on a busy machine.
beforeAll(async () => {
  await importCompositionUnder({ NODE_ENV: "development", MAIL_MODE: undefined });
  process.env = { ...ENV };
  vi.resetModules();
}, 30_000);

afterEach(() => {
  process.env = { ...ENV };
  vi.resetModules();
});

describe("a production deployment that cannot deliver does not start", () => {
  it("refuses when the mode is absent", async () => {
    await expect(
      importCompositionUnder({ NODE_ENV: "production", MAIL_MODE: undefined }),
    ).rejects.toThrow(/cannot deliver/i);
  });

  it("refuses when the mode is one that only pretends to send", async () => {
    await expect(
      importCompositionUnder({ NODE_ENV: "production", MAIL_MODE: "inert" }),
    ).rejects.toThrow(/cannot deliver/i);
  });

  it("refuses capture, which writes secrets to disk and delivers nothing", async () => {
    await expect(
      importCompositionUnder({ NODE_ENV: "production", MAIL_MODE: "capture" }),
    ).rejects.toThrow(/cannot deliver/i);
  });

  it("refuses a value nobody recognises rather than falling back", async () => {
    await expect(
      importCompositionUnder({ NODE_ENV: "production", MAIL_MODE: "relay" }),
    ).rejects.toThrow(/not recognised/i);
  });
});

describe("development is untouched by the production rule", () => {
  it("starts with no mail configuration at all", async () => {
    const mail = await importCompositionUnder({ NODE_ENV: "development", MAIL_MODE: undefined });

    expect(mail.createMailAdapter).toBeTypeOf("function");
  });

  it("starts on a value it does not recognise, warning rather than refusing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const mail = await importCompositionUnder({ NODE_ENV: "development", MAIL_MODE: "relay" });

    expect(mail.createMailAdapter).toBeTypeOf("function");
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });
});
