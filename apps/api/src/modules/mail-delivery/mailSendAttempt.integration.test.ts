/**
 * The recipient cap against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration`. This proves what a fake cannot: that the
 * advisory lock genuinely serialises two simultaneous reservations, so a cap of
 * N admits N and no more however many callers race for it.
 *
 * It is the whole reason the lock exists. Counting and then inserting passes
 * every unit test and still lets two concurrent sends past a cap of one,
 * because neither transaction sees the other's uncommitted row — which is a
 * property of the database and can only be disproved on one.
 *
 * Self-isolating: every run uses keys of its own and removes them afterwards,
 * so repeated runs never collide and nothing pre-existing is touched.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createMailSendAttemptRepository } from "./mailSendAttempt.repository.js";

const TAG = `wi5-${Date.now().toString(36)}`;
const keyFor = (name: string) => `${TAG}-${name}`;

const repo = createMailSendAttemptRepository();
const WINDOW_MS = 60 * 60 * 1000;
const since = () => new Date(Date.now() - WINDOW_MS);

/** How many callers contend in each race. Comfortably above every cap here. */
const RACERS = 12;

const removeThisRun = () =>
  prisma.mailSendAttempt.deleteMany({ where: { recipientKey: { startsWith: TAG } } });

/**
 * Open the connections the races need **before** any race runs.
 *
 * Without this the first race is not one: establishing a pooled connection is
 * itself serialising, so a cold pool makes concurrent callers take their turns
 * and the test passes whether or not the lock exists. That was observed —
 * removing the lock left this file's headline test green — and a proof that
 * only holds when it runs second is not a proof.
 */
beforeAll(async () => {
  await Promise.all(Array.from({ length: RACERS }, () => prisma.$queryRaw`SELECT 1`));
});

beforeEach(removeThisRun);
afterAll(async () => {
  await removeThisRun();
});

describe("concurrent reservations cannot exceed the recipient cap", () => {
  it("admits exactly the cap when many callers race for it at once", async () => {
    const recipientKey = keyFor("race");
    const CAP = 3;

    // Every reservation is started before any is awaited, so they contend for
    // the same recipient's lock rather than queueing politely.
    const results = await Promise.all(
      Array.from({ length: RACERS }, () =>
        repo.reserveForRecipient({ recipientKey, since: since(), limit: CAP }),
      ),
    );

    const admitted = results.filter((id) => id !== null);
    expect(admitted).toHaveLength(CAP);

    // And the table agrees — the cap is not merely what the callers were told.
    const stored = await prisma.mailSendAttempt.count({ where: { recipientKey } });
    expect(stored).toBe(CAP);
  });

  it("admits every caller when the cap is not the binding constraint", async () => {
    const recipientKey = keyFor("headroom");

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        repo.reserveForRecipient({ recipientKey, since: since(), limit: 50 }),
      ),
    );

    expect(results.every((id) => id !== null)).toBe(true);
  });

  it("caps each recipient separately, so one cannot exhaust another's allowance", async () => {
    const a = keyFor("a");
    const b = keyFor("b");
    const CAP = 2;

    await Promise.all([
      ...Array.from({ length: 6 }, () =>
        repo.reserveForRecipient({ recipientKey: a, since: since(), limit: CAP }),
      ),
      ...Array.from({ length: 6 }, () =>
        repo.reserveForRecipient({ recipientKey: b, since: since(), limit: CAP }),
      ),
    ]);

    expect(await prisma.mailSendAttempt.count({ where: { recipientKey: a } })).toBe(CAP);
    expect(await prisma.mailSendAttempt.count({ where: { recipientKey: b } })).toBe(CAP);
  });
});

describe("the window is what bounds the count, not the table", () => {
  it("ignores attempts that have fallen outside it", async () => {
    const recipientKey = keyFor("window");

    // An attempt older than the window: present in the table, irrelevant to it.
    await prisma.mailSendAttempt.create({
      data: {
        recipientKey,
        outcome: "accepted",
        createdAt: new Date(Date.now() - 2 * WINDOW_MS),
      },
    });

    const id = await repo.reserveForRecipient({ recipientKey, since: since(), limit: 1 });

    expect(id).not.toBeNull();
  });
});

describe("a reserved attempt is recorded before anything is sent", () => {
  it("starts as unknown and is corrected once the outcome is known", async () => {
    const recipientKey = keyFor("outcome");

    const id = await repo.reserveForRecipient({ recipientKey, since: since(), limit: 1 });
    expect(id).not.toBeNull();

    const reserved = await prisma.mailSendAttempt.findUniqueOrThrow({ where: { id: id! } });
    expect(reserved.outcome).toBe("unknown");

    await repo.setOutcome(id!, "accepted");

    const corrected = await prisma.mailSendAttempt.findUniqueOrThrow({ where: { id: id! } });
    expect(corrected.outcome).toBe("accepted");
  });
});
