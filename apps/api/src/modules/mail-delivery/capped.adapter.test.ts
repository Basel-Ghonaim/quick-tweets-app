/**
 * The abuse controls, over a fake repository and an injected clock.
 *
 * The subject is what the decorator *decides*: when it refuses, when it lets a
 * send through, and what it does when it cannot tell. Whether two concurrent
 * reservations can both succeed is the database's property, established by the
 * integration test rather than claimed here.
 */

import { describe, expect, it, vi } from "vitest";

import { createCappedMailAdapter } from "./capped.adapter.js";
import type { IMailSendAttemptRepository } from "./mailSendAttempt.repository.js";
import type { MailAdapter, MailMessage, MailResult } from "./mail.types.js";

const MESSAGE: MailMessage = {
  to: "holder@example.test",
  subject: "Your verification code",
  body: "…",
};

const NOW = new Date("2026-09-01T12:00:00.000Z");

const fakeRepo = (over: Partial<IMailSendAttemptRepository> = {}): IMailSendAttemptRepository => ({
  reserveForRecipient: vi.fn(async () => 1),
  setOutcome: vi.fn(async () => {}),
  countForRecipient: vi.fn(async () => 0),
  countAll: vi.fn(async () => 0),
  deleteBefore: vi.fn(async () => 0),
  ...over,
});

const innerReturning = (result: MailResult): MailAdapter => ({ send: vi.fn(async () => result) });

const build = (repo: IMailSendAttemptRepository, inner?: MailAdapter) => {
  const backend = inner ?? innerReturning({ outcome: "accepted" });
  const adapter = createCappedMailAdapter(backend, {
    repo,
    recipientCap: 3,
    recipientWindowMs: 24 * 60 * 60 * 1000,
    outboundCeiling: 100,
    ceilingWindowMs: 24 * 60 * 60 * 1000,
    now: () => NOW,
    log: () => {},
  });
  return { adapter, backend };
};

describe("a send within both controls", () => {
  it("reaches the backend and returns its result untouched", async () => {
    const { adapter, backend } = build(fakeRepo());

    const result = await adapter.send(MESSAGE);

    expect(result).toEqual({ outcome: "accepted" });
    expect(backend.send).toHaveBeenCalledWith(MESSAGE);
  });

  it("records the outcome against the reserved attempt", async () => {
    const repo = fakeRepo({ reserveForRecipient: vi.fn(async () => 42) });
    const { adapter } = build(repo, innerReturning({ outcome: "refused", reason: "nope" }));

    await adapter.send(MESSAGE);

    expect(repo.setOutcome).toHaveBeenCalledWith(42, "refused");
  });

  it("consumes quota for an unknown outcome — the message may well have gone", async () => {
    const repo = fakeRepo({ reserveForRecipient: vi.fn(async () => 7) });
    const { adapter } = build(repo, innerReturning({ outcome: "unknown", reason: "timeout" }));

    const result = await adapter.send(MESSAGE);

    expect(result.outcome).toBe("unknown");
    // The attempt was reserved before the send, so it counts whatever happened.
    expect(repo.reserveForRecipient).toHaveBeenCalledTimes(1);
    expect(repo.setOutcome).toHaveBeenCalledWith(7, "unknown");
  });
});

describe("the recipient cap", () => {
  it("refuses when the recipient's window is full, and never reaches the backend", async () => {
    const repo = fakeRepo({ reserveForRecipient: vi.fn(async () => null) });
    const { adapter, backend } = build(repo);

    const result = await adapter.send(MESSAGE);

    expect(result.outcome).toBe("refused");
    expect(backend.send).not.toHaveBeenCalled();
  });

  it("asks about the window the settings describe", async () => {
    const repo = fakeRepo();
    const { adapter } = build(repo);

    await adapter.send(MESSAGE);

    expect(repo.reserveForRecipient).toHaveBeenCalledWith({
      recipientKey: expect.any(String),
      since: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
      limit: 3,
    });
  });

  it("keys on the recipient rather than the raw address", async () => {
    const repo = fakeRepo();
    const { adapter } = build(repo);

    await adapter.send(MESSAGE);

    const [[arg]] = (repo.reserveForRecipient as ReturnType<typeof vi.fn>).mock.calls;
    expect(arg.recipientKey).not.toContain("holder");
    expect(arg.recipientKey).toHaveLength(64);
  });
});

describe("the outbound ceiling", () => {
  it("trips when the window is full, and never reaches the backend", async () => {
    const repo = fakeRepo({ countAll: vi.fn(async () => 100) });
    const { adapter, backend } = build(repo);

    const result = await adapter.send(MESSAGE);

    expect(result.outcome).toBe("refused");
    expect(backend.send).not.toHaveBeenCalled();
  });

  it("emits a greppable line when it trips — the whole of the in-process alarm", async () => {
    const lines: string[] = [];
    const repo = fakeRepo({ countAll: vi.fn(async () => 100) });
    const adapter = createCappedMailAdapter(innerReturning({ outcome: "accepted" }), {
      repo,
      recipientCap: 3,
      recipientWindowMs: 1000,
      outboundCeiling: 100,
      ceilingWindowMs: 1000,
      now: () => NOW,
      log: (m) => lines.push(m),
    });

    await adapter.send(MESSAGE);

    expect(lines.some((l) => l.includes("[mail:ceiling]"))).toBe(true);
  });

  it("is checked before the recipient's lock is taken", async () => {
    const repo = fakeRepo({ countAll: vi.fn(async () => 100) });
    const { adapter } = build(repo);

    await adapter.send(MESSAGE);

    expect(repo.reserveForRecipient).not.toHaveBeenCalled();
  });
});

describe("when the control cannot be enforced", () => {
  it("refuses rather than sending, if the ceiling cannot be read", async () => {
    const repo = fakeRepo({
      countAll: vi.fn(async () => {
        throw new Error("connection lost");
      }),
    });
    const { adapter, backend } = build(repo);

    const result = await adapter.send(MESSAGE);

    expect(result.outcome).toBe("refused");
    expect(backend.send).not.toHaveBeenCalled();
  });

  it("refuses rather than sending, if the reservation fails", async () => {
    const repo = fakeRepo({
      reserveForRecipient: vi.fn(async () => {
        throw new Error("deadlock detected");
      }),
    });
    const { adapter, backend } = build(repo);

    const result = await adapter.send(MESSAGE);

    expect(result.outcome).toBe("refused");
    expect(backend.send).not.toHaveBeenCalled();
  });

  it("does not leak the internal reason to the caller", async () => {
    const repo = fakeRepo({
      countAll: vi.fn(async () => {
        throw new Error("password authentication failed for user postgres");
      }),
    });
    const { adapter } = build(repo);

    const result = await adapter.send(MESSAGE);

    expect(result.outcome === "refused" && result.reason).not.toContain("password");
  });

  it("still returns the send's result when only the outcome could not be recorded", async () => {
    const repo = fakeRepo({
      setOutcome: vi.fn(async () => {
        throw new Error("write failed");
      }),
    });
    const { adapter } = build(repo);

    const result = await adapter.send(MESSAGE);

    // The attempt is already counted, which is what the control needs.
    expect(result).toEqual({ outcome: "accepted" });
  });
});

describe("the decorator never throws", () => {
  it("reports a refusal rather than raising, whatever the repository does", async () => {
    const repo = fakeRepo({
      countAll: vi.fn(async () => {
        throw "a bare string";
      }),
    });
    const { adapter } = build(repo);

    await expect(adapter.send(MESSAGE)).resolves.toMatchObject({ outcome: "refused" });
  });
});
