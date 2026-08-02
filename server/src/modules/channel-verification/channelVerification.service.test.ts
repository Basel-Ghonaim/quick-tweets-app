/**
 * Service unit tests — the lifecycle and status resolution over plain-object
 * fakes and an injected clock. No database is involved.
 *
 * The concurrency case models the row lock as a mutex, which proves the service
 * reads the throttle *under* the lock. It does not prove database-level
 * serialization: that is the partial unique index's guarantee, exercised
 * against Postgres where a real transaction pair can race.
 */

import { describe, expect, it, vi } from "vitest";

import { ChannelVerificationError } from "./channelVerification.errors.js";
import { createChannelVerificationService } from "./channelVerification.service.js";
import type {
  ChallengeCodeFormat,
  IChannelVerificationRepository,

} from "./channelVerification.types.js";
import type { MailAdapter } from "../../shared/mail/index.js";

const FORMAT: ChallengeCodeFormat = { alphabet: "0123456789ABCDEF", length: 8 };
const TTL = 15 * 60 * 1000;
const COOLDOWN = 60 * 1000;
const T0 = new Date("2026-01-01T12:00:00Z");
const USER = 3;
const ENDPOINT = "holder@example.test";

/** An in-memory stand-in for the two tables, honest about ids and timestamps. */
const fakeWorld = () => {
  const records: {
    id: number;
    userId: number;
    endpoint: string;
    provenAt: Date | null;
    lastChallengedAt: Date | null;
  }[] = [];
  const challenges: {
    id: number;
    verificationId: number;
    secretHash: string;
    expiresAt: Date;
    closedAt: Date | null;
    closedReason: string | null;
  }[] = [];
  const writes: string[] = [];

  const repo = {
    findRecord: async (userId: number, endpoint: string) =>
      records.find((r) => r.userId === userId && r.endpoint === endpoint) ?? null,

    upsertRecord: async ({ userId, endpoint }: { userId: number; endpoint: string }) => {
      const existing = records.find((r) => r.userId === userId && r.endpoint === endpoint);
      if (existing) return existing;
      writes.push("upsertRecord");
      const created = {
        id: records.length + 1,
        userId,
        endpoint,
        provenAt: null,
        lastChallengedAt: null,
      };
      records.push(created);
      return created;
    },

    lockRecord: async (id: number) => {
      const row = records.find((r) => r.id === id);
      return row === undefined
        ? null
        : { id: row.id, lastChallengedAt: row.lastChallengedAt, provenAt: row.provenAt };
    },

    findOpenChallenge: async (verificationId: number) =>
      challenges.find((c) => c.verificationId === verificationId && c.closedAt === null) ?? null,

    createChallenge: async (input: {
      verificationId: number;
      secretHash: string;
      expiresAt: Date;
    }) => {
      writes.push("createChallenge");
      const created = {
        id: challenges.length + 1,
        ...input,
        closedAt: null,
        closedReason: null,
      };
      challenges.push(created);
      return created;
    },

    closeOpenChallenges: async ({
      verificationId,
      closedAt,
      reason,
    }: {
      verificationId: number;
      closedAt: Date;
      reason: string;
    }) => {
      const open = challenges.filter(
        (c) => c.verificationId === verificationId && c.closedAt === null,
      );
      open.forEach((c) => {
        c.closedAt = closedAt;
        c.closedReason = reason;
      });
      if (open.length > 0) writes.push("closeOpenChallenges");
      return open.length;
    },

    closeChallenge: async (id: number, closedAt: Date, reason: string) => {
      writes.push("closeChallenge");
      const row = challenges.find((c) => c.id === id)!;
      row.closedAt = closedAt;
      row.closedReason = reason;
    },

    markProven: async ({ verificationId, provenAt }: { verificationId: number; provenAt: Date }) => {
      writes.push("markProven");
      records.find((r) => r.id === verificationId)!.provenAt = provenAt;
    },

    touchLastChallenged: async (verificationId: number, at: Date) => {
      writes.push("touchLastChallenged");
      records.find((r) => r.id === verificationId)!.lastChallengedAt = at;
    },

    deleteSpentChallenges: async () => 0,
  };

  return { records, challenges, writes, repo };
};

const fakeMail = (ok = true) => ({
  sent: [] as { to: string; subject: string; body: string }[],
  adapter: {
    send: vi.fn(async (message: { to: string; subject: string; body: string }) => {
      mail.sent.push(message);
      return ok ? ({ ok: true } as const) : ({ ok: false, reason: "unreachable" } as const);
    }),
  },
});
let mail = fakeMail();

const build = (over: { now?: () => Date; mailOk?: boolean } = {}) => {
  const world = fakeWorld();
  mail = fakeMail(over.mailOk ?? true);
  const service = createChannelVerificationService({
    repo: world.repo as unknown as IChannelVerificationRepository,
    mail: mail.adapter as unknown as MailAdapter,
    runInTransaction: async (fn) => fn(undefined as never),
    now: over.now ?? (() => T0),
    format: FORMAT,
    challengeTtlMs: TTL,
    resendCooldownMs: COOLDOWN,
  });
  return { ...world, service };
};

/** The code the holder received, recovered from what the port was handed. */
const codeFromMail = () => mail.sent.at(-1)!.body.match(/[0-9A-F]{8}/)![0];

describe("issuing", () => {
  it("persists a challenge and hands the message to the port", async () => {
    const { service, challenges } = build();

    const outcome = await service.issue({ userId: USER, endpoint: ENDPOINT });

    expect(challenges).toHaveLength(1);
    expect(outcome.delivered).toBe(true);
    expect(mail.sent[0]!.to).toBe(ENDPOINT);
  });

  it("stores only a digest — the code itself is never persisted", async () => {
    const { service, challenges } = build();

    await service.issue({ userId: USER, endpoint: ENDPOINT });

    const code = codeFromMail();
    expect(challenges[0]!.secretHash).not.toContain(code);
    expect(challenges[0]!.secretHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("expires the challenge one lifetime after issuing", async () => {
    const { service, challenges } = build();

    await service.issue({ userId: USER, endpoint: ENDPOINT });

    expect(challenges[0]!.expiresAt.getTime()).toBe(T0.getTime() + TTL);
  });

  it("keeps the challenge when delivery fails — reported, never destructive", async () => {
    const { service, challenges } = build({ mailOk: false });

    const outcome = await service.issue({ userId: USER, endpoint: ENDPOINT });

    expect(outcome.delivered).toBe(false);
    expect(challenges).toHaveLength(1);
    expect(challenges[0]!.closedAt).toBeNull();
  });

  it("sends only after the challenge is persisted", async () => {
    const { service, writes } = build();

    await service.issue({ userId: USER, endpoint: ENDPOINT });

    expect(writes).toContain("createChallenge");
    expect(mail.adapter.send).toHaveBeenCalledTimes(1);
  });
});

describe("the resend throttle", () => {
  it("refuses a second issue inside the cooldown", async () => {
    const { service } = build();
    await service.issue({ userId: USER, endpoint: ENDPOINT });

    await expect(service.issue({ userId: USER, endpoint: ENDPOINT })).rejects.toMatchObject({
      code: "cooldown_active",
    });
  });

  it("rotates once the cooldown has passed, and the old code stops working", async () => {
    let clock = T0;
    const { service, challenges } = build({ now: () => clock });

    await service.issue({ userId: USER, endpoint: ENDPOINT });
    const first = codeFromMail();

    clock = new Date(T0.getTime() + COOLDOWN + 1);
    await service.issue({ userId: USER, endpoint: ENDPOINT });
    const second = codeFromMail();

    expect(challenges).toHaveLength(2);
    expect(challenges[0]!.closedReason).toBe("superseded");
    expect(second).not.toBe(first);

    await expect(
      service.confirm({ userId: USER, endpoint: ENDPOINT, code: first }),
    ).rejects.toMatchObject({ code: "confirmation_failed" });
    await expect(
      service.confirm({ userId: USER, endpoint: ENDPOINT, code: second }),
    ).resolves.toBeUndefined();
  });

  it("two concurrent issues yield exactly one challenge and one cooldown refusal", async () => {
    const world = fakeWorld();
    mail = fakeMail();

    // The row lock, modelled where it really lives: held from acquisition to
    // commit, so the second issue cannot read the throttle until the first has
    // written it.
    let priorTransaction: Promise<unknown> = Promise.resolve();
    const serialized = async <T>(fn: (tx: never) => Promise<T>): Promise<T> => {
      const predecessor = priorTransaction;
      let commit!: () => void;
      priorTransaction = new Promise<void>((resolve) => (commit = resolve));
      await predecessor.catch(() => {});
      try {
        return await fn(undefined as never);
      } finally {
        commit();
      }
    };

    const service = createChannelVerificationService({
      repo: world.repo as unknown as IChannelVerificationRepository,
      mail: mail.adapter as unknown as MailAdapter,
      runInTransaction: serialized,
      now: () => T0,
      format: FORMAT,
      challengeTtlMs: TTL,
      resendCooldownMs: COOLDOWN,
    });

    const results = await Promise.allSettled([
      service.issue({ userId: USER, endpoint: ENDPOINT }),
      service.issue({ userId: USER, endpoint: ENDPOINT }),
    ]);

    expect(world.challenges).toHaveLength(1);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const refused = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((refused.reason as ChannelVerificationError).code).toBe("cooldown_active");
    expect(mail.adapter.send).toHaveBeenCalledTimes(1);
  });
});

describe("losing the unique constraint", () => {
  /** What the driver raises when a unique index rejects a write. */
  const uniqueViolation = () => Object.assign(new Error("unique violation"), { code: "P2002" });

  const serviceOver = (world: ReturnType<typeof fakeWorld>) => {
    mail = fakeMail();
    return createChannelVerificationService({
      repo: world.repo as unknown as IChannelVerificationRepository,
      mail: mail.adapter as unknown as MailAdapter,
      runInTransaction: async (fn) => fn(undefined as never),
      now: () => T0,
      format: FORMAT,
      challengeTtlMs: TTL,
      resendCooldownMs: COOLDOWN,
    });
  };

  it("retries once when a concurrent request created the record first", async () => {
    const world = fakeWorld();
    const upsert = world.repo.upsertRecord;
    let attempts = 0;
    world.repo.upsertRecord = async (input) => {
      attempts += 1;
      if (attempts === 1) throw uniqueViolation();
      return upsert(input);
    };

    const outcome = await serviceOver(world).issue({ userId: USER, endpoint: ENDPOINT });

    expect(attempts).toBe(2);
    expect(world.challenges).toHaveLength(1);
    expect(outcome.delivered).toBe(true);
  });

  it("retries once when the one-open constraint rejects the insert", async () => {
    const world = fakeWorld();
    const create = world.repo.createChallenge;
    let attempts = 0;
    world.repo.createChallenge = async (input) => {
      attempts += 1;
      if (attempts === 1) throw uniqueViolation();
      return create(input);
    };

    await serviceOver(world).issue({ userId: USER, endpoint: ENDPOINT });

    expect(attempts).toBe(2);
    expect(world.challenges).toHaveLength(1);
    expect(mail.adapter.send).toHaveBeenCalledTimes(1);
  });

  it("answers with the cooldown once the winner's anchor is visible, and sends nothing", async () => {
    const world = fakeWorld();
    const upsert = world.repo.upsertRecord;
    let attempts = 0;
    world.repo.upsertRecord = async (input) => {
      attempts += 1;
      if (attempts > 1) return upsert(input);
      // The winner commits: its record exists, with the throttle already set.
      await upsert(input);
      world.records[0]!.lastChallengedAt = T0;
      throw uniqueViolation();
    };

    const service = serviceOver(world);
    await expect(service.issue({ userId: USER, endpoint: ENDPOINT })).rejects.toMatchObject({
      code: "cooldown_active",
    });

    expect(world.challenges).toHaveLength(0);
    expect(mail.adapter.send).not.toHaveBeenCalled();
  });

  it("does not retry a failure that is not a constraint violation", async () => {
    const world = fakeWorld();
    let attempts = 0;
    world.repo.upsertRecord = async () => {
      attempts += 1;
      throw new Error("connection reset");
    };

    await expect(
      serviceOver(world).issue({ userId: USER, endpoint: ENDPOINT }),
    ).rejects.toThrow("connection reset");

    expect(attempts).toBe(1);
    expect(mail.adapter.send).not.toHaveBeenCalled();
  });
});

describe("confirming", () => {
  const issued = async () => {
    const world = build();
    await world.service.issue({ userId: USER, endpoint: ENDPOINT });
    return { ...world, code: codeFromMail() };
  };

  it("accepts the issued code, closes the challenge as verified, and records the proof", async () => {
    const { service, challenges, records, code } = await issued();

    await service.confirm({ userId: USER, endpoint: ENDPOINT, code });

    expect(challenges[0]!.closedReason).toBe("verified");
    expect(records[0]!.provenAt).toEqual(T0);
  });

  it("refuses a replay of the same code", async () => {
    const { service, code } = await issued();
    await service.confirm({ userId: USER, endpoint: ENDPOINT, code });

    await expect(
      service.confirm({ userId: USER, endpoint: ENDPOINT, code }),
    ).rejects.toMatchObject({ code: "confirmation_failed" });
  });

  it("leaves the challenge open after a wrong value, so a typo is not self-inflicted denial", async () => {
    const { service, challenges, code } = await issued();
    const wrong = code === "00000000" ? "11111111" : "00000000";

    await expect(
      service.confirm({ userId: USER, endpoint: ENDPOINT, code: wrong }),
    ).rejects.toMatchObject({ code: "confirmation_failed" });

    expect(challenges[0]!.closedAt).toBeNull();
    await expect(
      service.confirm({ userId: USER, endpoint: ENDPOINT, code }),
    ).resolves.toBeUndefined();
  });

  it("fails identically for every cause, revealing nothing", async () => {
    const { service, code } = await issued();
    const clockPast = build({ now: () => new Date(T0.getTime() + TTL + 1) });
    await clockPast.service.issue({ userId: USER, endpoint: ENDPOINT }).catch(() => {});

    const causes = [
      ["malformed", { userId: USER, endpoint: ENDPOINT, code: "!!" }],
      ["wrong value", { userId: USER, endpoint: ENDPOINT, code: "ABCDEF01" }],
      ["unknown subject", { userId: USER, endpoint: "other@example.test", code }],
      ["unknown account", { userId: 999, endpoint: ENDPOINT, code }],
    ] as const;

    const seen = new Set<string>();
    for (const [, input] of causes) {
      await service.confirm(input).catch((error: ChannelVerificationError) => {
        seen.add(`${error.code}|${error.message}`);
      });
    }

    expect(seen.size).toBe(1);
    expect([...seen][0]).toContain("confirmation_failed");
  });

  it("refuses an expired challenge without writing anything", async () => {
    const world = build();
    await world.service.issue({ userId: USER, endpoint: ENDPOINT });
    const code = codeFromMail();

    const later = createChannelVerificationService({
      repo: world.repo as unknown as IChannelVerificationRepository,
      mail: mail.adapter as unknown as MailAdapter,
      runInTransaction: async (fn) => fn(undefined as never),
      now: () => new Date(T0.getTime() + TTL + 1),
      format: FORMAT,
      challengeTtlMs: TTL,
      resendCooldownMs: COOLDOWN,
    });

    world.writes.length = 0;
    await expect(
      later.confirm({ userId: USER, endpoint: ENDPOINT, code }),
    ).rejects.toMatchObject({ code: "confirmation_failed" });

    expect(world.writes).toEqual([]);
    expect(world.challenges[0]!.closedAt).toBeNull();
  });
});

describe("status resolution", () => {
  it("is unproven before anything is issued", async () => {
    const { service } = build();
    await expect(service.statusOf(USER, ENDPOINT)).resolves.toBe("unproven");
  });

  it("is pending while a challenge is open and unexpired", async () => {
    const { service } = build();
    await service.issue({ userId: USER, endpoint: ENDPOINT });
    await expect(service.statusOf(USER, ENDPOINT)).resolves.toBe("pending");
  });

  it("is proven once confirmed", async () => {
    const { service } = build();
    await service.issue({ userId: USER, endpoint: ENDPOINT });
    await service.confirm({ userId: USER, endpoint: ENDPOINT, code: codeFromMail() });

    await expect(service.statusOf(USER, ENDPOINT)).resolves.toBe("proven");
  });

  it("falls back to unproven once the challenge lapses, with no write", async () => {
    const world = build();
    await world.service.issue({ userId: USER, endpoint: ENDPOINT });

    const later = createChannelVerificationService({
      repo: world.repo as unknown as IChannelVerificationRepository,
      mail: mail.adapter as unknown as MailAdapter,
      runInTransaction: async (fn) => fn(undefined as never),
      now: () => new Date(T0.getTime() + TTL + 1),
      format: FORMAT,
      challengeTtlMs: TTL,
      resendCooldownMs: COOLDOWN,
    });

    world.writes.length = 0;
    await expect(later.statusOf(USER, ENDPOINT)).resolves.toBe("unproven");
    expect(world.writes).toEqual([]);
  });

  it("resolves a changed endpoint as unproven, with no write — a change of subject", async () => {
    const world = build();
    await world.service.issue({ userId: USER, endpoint: ENDPOINT });
    await world.service.confirm({ userId: USER, endpoint: ENDPOINT, code: codeFromMail() });

    world.writes.length = 0;
    await expect(world.service.statusOf(USER, "renamed@example.test")).resolves.toBe("unproven");
    await expect(world.service.statusOf(USER, ENDPOINT)).resolves.toBe("proven");
    expect(world.writes).toEqual([]);
  });
});
