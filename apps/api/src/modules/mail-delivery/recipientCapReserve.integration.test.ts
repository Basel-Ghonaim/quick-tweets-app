/**
 * The reserved floor against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration`. Proves the property a fake cannot: that
 * two different admission limits against ONE shared per-recipient count behave
 * as a reserve rather than as two separate quotas.
 *
 * There is no purpose column and no second count. A "reserved" call and a
 * "general" call for the same address share the same running total; only the
 * threshold each is admitted under differs — which is the whole of what
 * "asymmetric admission" means (ADR 0015 Decision 6, met by ADR 0016). This
 * file exercises the repository directly, at the level the reserve actually
 * lives, rather than through `createMailAdapter`'s composition — proving the
 * mechanism needs no mail transport, no mode, and no network to hold.
 *
 * Self-isolating: every run uses a key of its own and removes it afterwards.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createMailSendAttemptRepository } from "./mailSendAttempt.repository.js";

const TAG = `capreserve-${Date.now().toString(36)}`;
const keyFor = (name: string) => `${TAG}-${name}`;

const repo = createMailSendAttemptRepository();
const WINDOW_MS = 60 * 60 * 1000;
const since = () => new Date(Date.now() - WINDOW_MS);

const RESERVED = 20;
const GENERAL = 15;
/** The slots only the reserved caller can reach — the reserve itself. */
const RESERVE = RESERVED - GENERAL;

const removeThisRun = () =>
  prisma.mailSendAttempt.deleteMany({ where: { recipientKey: { startsWith: TAG } } });

beforeEach(removeThisRun);
afterAll(removeThisRun);

describe("a general call and a reserved call share one count for the same address", () => {
  it("admits the reserved caller past the point the general caller is refused", async () => {
    const recipientKey = keyFor("shared");

    // Fill the address to exactly the general limit, as any consumer would.
    for (let i = 0; i < GENERAL; i += 1) {
      const id = await repo.reserveForRecipient({ recipientKey, since: since(), limit: GENERAL });
      expect(id).not.toBeNull();
    }

    // The general limit is now exhausted for this address.
    const refusedGeneral = await repo.reserveForRecipient({
      recipientKey,
      since: since(),
      limit: GENERAL,
    });
    expect(refusedGeneral).toBeNull();

    // The reserved caller, asking about the SAME address, still has headroom —
    // it is reading the same shared count against a higher threshold.
    for (let i = 0; i < RESERVE; i += 1) {
      const id = await repo.reserveForRecipient({ recipientKey, since: since(), limit: RESERVED });
      expect(id).not.toBeNull();
    }

    // The reserve is exactly RESERVE slots, not open-ended: once the shared
    // count reaches the reserved limit too, even the reserved caller refuses.
    const refusedReserved = await repo.reserveForRecipient({
      recipientKey,
      since: since(),
      limit: RESERVED,
    });
    expect(refusedReserved).toBeNull();

    const stored = await prisma.mailSendAttempt.count({ where: { recipientKey } });
    expect(stored).toBe(RESERVED);
  });

  it("lets the reserved caller use full headroom when the general caller never touched it", async () => {
    const recipientKey = keyFor("headroom");

    const results = await Promise.all(
      Array.from({ length: RESERVED }, () =>
        repo.reserveForRecipient({ recipientKey, since: since(), limit: RESERVED }),
      ),
    );

    expect(results.every((id) => id !== null)).toBe(true);
  });
});
