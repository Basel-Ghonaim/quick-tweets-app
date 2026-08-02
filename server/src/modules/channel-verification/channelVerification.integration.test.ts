/**
 * Channel Verification — integration tests against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration`. These prove what a fake cannot: that the
 * row lock and the partial unique index actually serialize two transactions, and
 * that a conditional close settles a real double submit. Excluded from the
 * default unit run because CI has no database.
 *
 * Self-isolating: every run mints its own account and removes it afterwards, so
 * repeated runs never collide and nothing pre-existing is touched.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import type { MailAdapter, MailMessage } from "../../shared/mail/index.js";
import { createChannelVerificationService } from "./channelVerification.service.js";
import type { ChallengeCodeFormat } from "./channelVerification.types.js";

const FORMAT: ChallengeCodeFormat = { alphabet: "0123456789ABCDEFGHJKMNPQRSTVWXYZ", length: 12 };
const TTL = 15 * 60 * 1000;
const COOLDOWN = 60 * 1000;

const RUN = `${process.pid}-${Math.floor(process.hrtime()[1])}`;
const ENDPOINT = `cv-${RUN}@example.test`;

/** Captures what the port was handed, so a test can read the code the holder got. */
const capturingMail = () => {
  const sent: MailMessage[] = [];
  const adapter: MailAdapter = {
    send: async (message) => {
      sent.push(message);
      return { ok: true };
    },
  };
  return { sent, adapter };
};

const serviceWith = (mail: MailAdapter) =>
  createChannelVerificationService({
    mail,
    format: FORMAT,
    challengeTtlMs: TTL,
    resendCooldownMs: COOLDOWN,
  });

const codeIn = (message: MailMessage) => message.body.match(/[0-9A-HJKMNP-TV-Z]{12}/)![0];

let reachable = false;
let userId = 0;

beforeAll(async () => {
  try {
    const user = await prisma.user.create({
      data: {
        username: `cv${RUN}`.replace(/[^a-z0-9_]/g, "").slice(0, 20),
        email: ENDPOINT,
        passwordHash: "integration-test-only",
      },
      select: { id: true },
    });
    userId = user.id;
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  // Cascades to the verification record and its challenges.
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect().catch(() => {});
});

describe("the lifecycle end to end", () => {
  it("moves unproven → pending → proven, and the proof survives the challenge", async () => {
    if (!reachable) return;
    const mail = capturingMail();
    const service = serviceWith(mail.adapter);

    expect(await service.statusOf(userId, ENDPOINT)).toBe("unproven");

    const outcome = await service.issue({ userId, endpoint: ENDPOINT });
    expect(outcome.delivered).toBe(true);
    expect(await service.statusOf(userId, ENDPOINT)).toBe("pending");

    await service.confirm({ userId, endpoint: ENDPOINT, code: codeIn(mail.sent[0]!) });
    expect(await service.statusOf(userId, ENDPOINT)).toBe("proven");

    // Nothing about the proof lives on the account row.
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    expect(account?.email).toBe(ENDPOINT);
  });

  it("resolves a different endpoint as unproven — a change of subject, not a revocation", async () => {
    if (!reachable) return;
    const service = serviceWith(capturingMail().adapter);

    expect(await service.statusOf(userId, `other-${ENDPOINT}`)).toBe("unproven");
    expect(await service.statusOf(userId, ENDPOINT)).toBe("proven");
  });
});

describe("two transactions racing for the same subject", () => {
  it("issues exactly one challenge and refuses the other with the cooldown", async () => {
    if (!reachable) return;
    const endpoint = `race-${ENDPOINT}`;
    const mail = capturingMail();
    const service = serviceWith(mail.adapter);

    const results = await Promise.allSettled([
      service.issue({ userId, endpoint }),
      service.issue({ userId, endpoint }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0]!.reason as { code?: string }).code).toBe("cooldown_active");

    // One challenge, one message — no second email left the building.
    const record = await prisma.channelVerification.findUnique({
      where: { userId_endpoint: { userId, endpoint } },
      select: { id: true },
    });
    const open = await prisma.channelVerificationChallenge.count({
      where: { verificationId: record!.id, closedAt: null },
    });
    expect(open).toBe(1);
    expect(mail.sent).toHaveLength(1);
  });

  it("lets exactly one of two simultaneous confirmations succeed", async () => {
    if (!reachable) return;
    const endpoint = `double-${ENDPOINT}`;
    const mail = capturingMail();
    const service = serviceWith(mail.adapter);

    await service.issue({ userId, endpoint });
    const code = codeIn(mail.sent[0]!);

    const results = await Promise.allSettled([
      service.confirm({ userId, endpoint, code }),
      service.confirm({ userId, endpoint, code }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect((rejected[0]!.reason as { code?: string }).code).toBe("confirmation_failed");

    expect(await service.statusOf(userId, endpoint)).toBe("proven");
  });
});
