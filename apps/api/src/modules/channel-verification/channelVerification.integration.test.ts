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

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../generated/prisma/client.js";
import { prisma, type DbClient, type RunInTransaction } from "../../shared/database/index.js";
import type { MailAdapter, MailMessage } from "../mail-delivery/index.js";
import { createUserService } from "../users/user.service.js";
import { createChannelVerificationRepository } from "./channelVerification.repository.js";
import { createChannelVerificationService } from "./channelVerification.service.js";
import { createChannelVerificationSweepJob } from "./channelVerification.sweep.job.js";
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
      return { outcome: "accepted" as const };
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
    expect(outcome.delivery).toBe("accepted");
    // A real window against a real clock: positive, and never longer than the
    // cooldown it is derived from.
    expect(outcome.resendAvailableInSeconds).toBeGreaterThan(0);
    expect(outcome.resendAvailableInSeconds).toBeLessThanOrEqual(COOLDOWN / 1000);
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

describe("custody — the account presents a fact it does not hold", () => {
  it("keeps zero verification columns on the account table", async () => {
    if (!reachable) return;
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`;

    const names = columns.map((c) => c.column_name);
    expect(names.filter((n) => /verif|proven|challeng|channel/i.test(n))).toEqual([]);
  });

  it("reports the status on the self-view, resolved rather than stored", async () => {
    if (!reachable) return;
    const profile = await createUserService().getMe(userId);

    // Proven by the first suite; the account row itself knows nothing about it.
    expect(profile.emailVerification).toBe("proven");
    expect(profile.email).toBe(ENDPOINT);
  });

  it("flips to unproven when the address changes, without writing to the capability", async () => {
    if (!reachable) return;

    const before = await prisma.channelVerification.findMany({
      where: { userId },
      select: { id: true, endpoint: true, provenAt: true, updatedAt: true },
      orderBy: { id: "asc" },
    });
    const challengesBefore = await prisma.channelVerificationChallenge.count();

    // No change-email path exists yet, so the column is moved directly: the
    // projection is what is under test here, not a user flow.
    const renamed = `renamed-${ENDPOINT}`;
    await prisma.user.update({ where: { id: userId }, data: { email: renamed } });

    try {
      const profile = await createUserService().getMe(userId);

      // A different value is a different subject — the old proof still stands,
      // it simply is not about this address.
      expect(profile.emailVerification).toBe("unproven");
      expect(profile.email).toBe(renamed);

      const after = await prisma.channelVerification.findMany({
        where: { userId },
        select: { id: true, endpoint: true, provenAt: true, updatedAt: true },
        orderBy: { id: "asc" },
      });
      expect(after).toEqual(before);
      expect(await prisma.channelVerificationChallenge.count()).toBe(challengesBefore);
    } finally {
      await prisma.user.update({ where: { id: userId }, data: { email: ENDPOINT } });
    }
  });

  it("restores to proven once the address is back — the proof was never revoked", async () => {
    if (!reachable) return;
    const profile = await createUserService().getMe(userId);

    expect(profile.emailVerification).toBe("proven");
  });
});

/** A database holding only this run's rows, so a sweep run in it can remove nothing else. */
interface ThrowawayDatabase {
  readonly name: string;
  readonly configuredName: string;
  readonly prisma: PrismaClient;
  readonly runInTransaction: RunInTransaction;
  drop(): Promise<void>;
}

const MIGRATIONS = fileURLToPath(new URL("../../../prisma/migrations", import.meta.url));

const createThrowawayDatabase = async (): Promise<ThrowawayDatabase> => {
  const configured = new URL(process.env.DATABASE_URL ?? "");
  const name = `cv_sweep_verify_${process.pid}_${process.hrtime.bigint()}`;
  const url = new URL(configured);
  url.pathname = `/${name}`;
  const admin = async (sql: string) => {
    const client = new pg.Client({ connectionString: configured.toString() });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }
  };
  const dropDatabase = () => admin(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);

  await admin(`CREATE DATABASE "${name}"`);
  try {
    const migrator = new pg.Client({ connectionString: url.toString() });
    await migrator.connect();
    try {
      const dirs = (await readdir(MIGRATIONS, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      for (const dir of dirs) {
        await migrator.query(await readFile(path.join(MIGRATIONS, dir, "migration.sql"), "utf8"));
      }
    } finally {
      await migrator.end();
    }
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
    return {
      name,
      configuredName: decodeURIComponent(configured.pathname.slice(1)),
      prisma: client,
      runInTransaction: (fn) => client.$transaction((tx) => fn(tx as unknown as DbClient)),
      drop: async () => {
        try {
          await client.$disconnect();
        } finally {
          await dropDatabase();
        }
      },
    };
  } catch (err) {
    await dropDatabase().catch((dropErr) => {
      throw new AggregateError(
        [err, dropErr],
        `could not build "${name}" (${String(err)}), then could not drop it (${String(dropErr)})`,
      );
    });
    throw err;
  }
};

// Checked on the very client the job is handed, so binding the sweep to any other
// database fails here instead of deleting that database's challenges.
const guardedSweep = async (own: ThrowawayDatabase, client: PrismaClient) => {
  const [bound] = await client.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (bound?.name !== own.name || bound.name === own.configuredName) {
    throw new Error(`refusing to sweep "${bound?.name}": only this run's throwaway database may be swept`);
  }
  // Retention of 1ms: everything already closed is past the window.
  await createChannelVerificationSweepJob({
    repo: createChannelVerificationRepository(client),
    retentionMs: 1,
    log: () => {},
  }).handler();
};

describe("the sweep, against real rows", () => {
  // The sweep removes every spent challenge in the database it is handed, so these
  // proofs run in a throwaway database of their own, and fail if none can be made.
  let own: ThrowawayDatabase | undefined;
  let ownUserId = 0;
  let unavailable: unknown;

  beforeAll(async () => {
    if (!reachable) return;
    try {
      own = await createThrowawayDatabase();
      const user = await own.prisma.user.create({
        data: {
          username: `cv${RUN}`.replace(/[^a-z0-9_]/g, "").slice(0, 20),
          email: ENDPOINT,
          passwordHash: "integration-test-only",
        },
        select: { id: true },
      });
      ownUserId = user.id;
    } catch (err) {
      unavailable = err;
    }
  }, 60_000);

  afterAll(async () => {
    await own?.drop();
  }, 30_000);

  // Under the names the proofs already use, so their assertions read exactly as before.
  const inOwnDatabase = () => {
    if (!own || unavailable !== undefined) {
      throw new Error(`the sweep proofs' throwaway database is unavailable: ${String(unavailable)}`);
    }
    const db = own;
    return {
      prisma: db.prisma,
      userId: ownUserId,
      serviceWith: (mail: MailAdapter) =>
        createChannelVerificationService({
          mail,
          format: FORMAT,
          challengeTtlMs: TTL,
          resendCooldownMs: COOLDOWN,
          repo: createChannelVerificationRepository(db.prisma),
          runInTransaction: db.runInTransaction,
        }),
      sweep: () => guardedSweep(db, db.prisma),
    };
  };

  it("removes spent challenges and leaves the proof standing", async () => {
    if (!reachable) return;
    const { prisma, userId, serviceWith, sweep } = inOwnDatabase();
    const endpoint = `sweep-${ENDPOINT}`;
    const mail = capturingMail();
    const service = serviceWith(mail.adapter);

    await service.issue({ userId, endpoint });
    await service.confirm({ userId, endpoint, code: codeIn(mail.sent[0]!) });
    expect(await service.statusOf(userId, endpoint)).toBe("proven");

    await sweep();

    const record = await prisma.channelVerification.findUnique({
      where: { userId_endpoint: { userId, endpoint } },
      select: { id: true, provenAt: true },
    });

    // The challenge is gone; the record and its proof are not.
    expect(record?.provenAt).not.toBeNull();
    expect(
      await prisma.channelVerificationChallenge.count({
        where: { verificationId: record!.id },
      }),
    ).toBe(0);
    expect(await service.statusOf(userId, endpoint)).toBe("proven");
  });

  it("changes no answer: a lapsed challenge reads the same swept or unswept", async () => {
    if (!reachable) return;
    const { prisma, userId, serviceWith, sweep } = inOwnDatabase();
    const endpoint = `lapsed-${ENDPOINT}`;
    const service = serviceWith(capturingMail().adapter);

    // A challenge that expired long ago and was never closed — the case the
    // sweep exists for, and the one D4 says needs no writer to read correctly.
    const record = await prisma.channelVerification.create({
      data: { userId, endpoint, updatedAt: new Date() },
      select: { id: true },
    });
    await prisma.channelVerificationChallenge.create({
      data: {
        verificationId: record.id,
        secretHash: "b".repeat(64),
        expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });

    const beforeSweep = await service.statusOf(userId, endpoint);
    expect(
      await prisma.channelVerificationChallenge.count({ where: { verificationId: record.id } }),
    ).toBe(1);

    await sweep();

    // The row is genuinely gone, so the comparison below means something.
    expect(
      await prisma.channelVerificationChallenge.count({ where: { verificationId: record.id } }),
    ).toBe(0);

    const afterSweep = await service.statusOf(userId, endpoint);

    expect(beforeSweep).toBe("unproven");
    expect(afterSweep).toBe(beforeSweep);
  });
});

// Its own subject: the cooldown is anchored per record, and the tests above
// leave one running on the account's own endpoint.
const SUBJECT = `cv-read-${RUN}@example.test`;

describe("the window the read reports", () => {
  it("agrees with what the issue answered, from the same anchor", async () => {
    if (!reachable) return;
    const service = serviceWith(capturingMail().adapter);

    const outcome = await service.issue({ userId, endpoint: SUBJECT });
    const read = await service.stateOf(userId, SUBJECT);

    expect(read.status).toBe("pending");
    // The read is produced a moment later, so it is never larger than what the
    // issue reported and at most a second smaller: both count down from the
    // anchor that issue stamped.
    expect(read.resendAvailableInSeconds).toBeLessThanOrEqual(outcome.resendAvailableInSeconds);
    expect(outcome.resendAvailableInSeconds - read.resendAvailableInSeconds).toBeLessThanOrEqual(1);
  });

  it("writes nothing — asking twice leaves the record and its challenge untouched", async () => {
    if (!reachable) return;
    const service = serviceWith(capturingMail().adapter);

    const snapshot = async () => ({
      record: await prisma.channelVerification.findFirst({
        where: { userId, endpoint: SUBJECT },
        select: { updatedAt: true, lastChallengedAt: true, provenAt: true },
      }),
      challenges: await prisma.channelVerificationChallenge.count({
        where: { verification: { userId, endpoint: SUBJECT } },
      }),
    });

    const before = await snapshot();
    await service.stateOf(userId, SUBJECT);
    await service.stateOf(userId, SUBJECT);
    const after = await snapshot();

    expect(after).toEqual(before);
  });
});
