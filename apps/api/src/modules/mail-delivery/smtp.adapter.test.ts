/**
 * The SMTP backend, against an injected transport.
 *
 * The subject here is the **classification rule**: which failures are a definite
 * refusal and which leave the outcome genuinely unknown. Getting that wrong is
 * not a cosmetic bug — a wrong `refused` claims knowledge the process does not
 * have, which is the guarantee the three-state result exists to provide.
 *
 * No test reaches a network. The transport is a stub throughout, so this file
 * can never send mail (I8).
 */

import { describe, expect, it, vi } from "vitest";

import { createSmtpMailAdapter } from "./smtp.adapter.js";
import type { MailMessage } from "./mail.types.js";

const MESSAGE: MailMessage = {
  to: "holder@example.test",
  subject: "Your verification code",
  body: "Your verification code is 8AQGDX4ZAEX7.",
};

const OPTIONS = {
  host: "smtp.example.test",
  port: 587,
  secure: false,
  user: "sender@example.test",
  password: "unused-by-the-stub",
  from: "quick-tweets <sender@example.test>",
  timeoutMs: 1000,
  log: () => {},
};

/** A transport that resolves, standing in for a relay that took the message. */
const accepting = () => ({ sendMail: vi.fn(async () => ({ messageId: "<x@example.test>" })) });

/** A transport that rejects with a given error shape. */
const failing = (error: unknown) => ({
  sendMail: vi.fn(async () => {
    throw error;
  }),
});

const adapterOver = (transport: unknown) =>
  createSmtpMailAdapter({ ...OPTIONS, transport: transport as never });

describe("a relay that takes the message", () => {
  it("reports acceptance, and claims nothing more", async () => {
    const result = await adapterOver(accepting()).send(MESSAGE);

    expect(result).toEqual({ outcome: "accepted" });
  });

  it("sends the message it was given, from the configured identity", async () => {
    const transport = accepting();

    await adapterOver(transport).send(MESSAGE);

    expect(transport.sendMail).toHaveBeenCalledWith({
      from: OPTIONS.from,
      to: MESSAGE.to,
      subject: MESSAGE.subject,
      text: MESSAGE.body,
    });
  });
});

describe("failures that provably preceded the hand-off are refusals", () => {
  const definite: [string, unknown][] = [
    ["connection refused", Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })],
    ["host not found", Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" })],
    ["authentication rejected", Object.assign(new Error("Invalid login"), { code: "EAUTH" })],
    ["envelope rejected", Object.assign(new Error("No recipients"), { code: "EENVELOPE" })],
    ["a permanent 5xx", Object.assign(new Error("550 mailbox unavailable"), { responseCode: 550 })],
  ];

  for (const [name, error] of definite) {
    it(`${name} is refused, not unknown`, async () => {
      const result = await adapterOver(failing(error)).send(MESSAGE);

      expect(result.outcome).toBe("refused");
    });
  }

  it("carries the reason, and nothing transport-shaped beyond it", async () => {
    const error = Object.assign(new Error("Invalid login"), { code: "EAUTH", responseCode: 535 });

    const result = await adapterOver(failing(error)).send(MESSAGE);

    expect(result).toEqual({ outcome: "refused", reason: "Invalid login" });
  });
});

describe("failures that leave the outcome open are unknown", () => {
  const open: [string, unknown][] = [
    ["a timeout", Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" })],
    ["a dropped socket", Object.assign(new Error("socket hang up"), { code: "ECONNRESET" })],
    ["a transient 4xx", Object.assign(new Error("451 try again"), { responseCode: 451 })],
    ["an error carrying no code at all", new Error("something went wrong")],
  ];

  for (const [name, error] of open) {
    it(`${name} is unknown, never refused`, async () => {
      const result = await adapterOver(failing(error)).send(MESSAGE);

      expect(result.outcome).toBe("unknown");
    });
  }

  it("says why it does not know", async () => {
    const error = Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" });

    const result = await adapterOver(failing(error)).send(MESSAGE);

    expect(result).toEqual({ outcome: "unknown", reason: "Timeout" });
  });
});

describe("the adapter never throws", () => {
  it("returns a result even when the transport throws a non-Error", async () => {
    const result = await adapterOver(failing("a bare string")).send(MESSAGE);

    expect(result.outcome).toBe("unknown");
  });
});
