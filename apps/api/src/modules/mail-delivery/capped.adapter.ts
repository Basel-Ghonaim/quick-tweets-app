/**
 * The abuse controls, as a decorator over any backend.
 *
 * It wraps whatever the registry returns, so the same path runs under every
 * backend — the control is exercised constantly in development rather than
 * meeting production for the first time, and a new backend inherits it without
 * doing anything (ADR 0015 Decision 4).
 *
 * Two controls, because the threat has two halves:
 *
 * - the **recipient cap** answers one inbox being flooded, and is exact;
 * - the **global ceiling** answers spend and sender reputation, which are
 *   measured against the sender and cannot be bounded by a recipient key.
 *
 * The ceiling is a **circuit breaker provisioned with headroom**, not an exact
 * quota, which is why it takes no lock: headroom absorbs the slippage a lock
 * would otherwise buy at the price of serialising every send in the system.
 *
 * A refusal here is a refusal, not an unknown — nothing was handed to a
 * transport. It is distinguishable from a transport failure **in diagnostics
 * only**: on the wire both are the same refusal, because telling a caller the
 * global ceiling is exhausted leaks system-wide state to a single account.
 */

import type { IMailSendAttemptRepository } from "./mailSendAttempt.repository.js";
import type { MailAdapter, MailMessage, MailResult } from "./mail.types.js";
import { recipientKey } from "./recipientKey.js";

export interface CappedMailAdapterOptions {
  repo: IMailSendAttemptRepository;
  recipientCap: number;
  recipientWindowMs: number;
  outboundCeiling: number;
  ceilingWindowMs: number;
  now?: () => Date;
  log?: (message: string) => void;
}

/**
 * The line an operator greps for. It is the whole of the in-process alarm, and
 * `mail.md` says so rather than implying coverage that does not exist.
 */
const CEILING_TRIPPED = "[mail:ceiling] outbound ceiling reached";

export const createCappedMailAdapter = (
  inner: MailAdapter,
  options: CappedMailAdapterOptions,
): MailAdapter => {
  const now = options.now ?? (() => new Date());
  const log = options.log ?? ((message: string) => console.log(message));
  const { repo, recipientCap, recipientWindowMs, outboundCeiling, ceilingWindowMs } = options;

  return {
    send: async (message: MailMessage): Promise<MailResult> => {
      const at = now();
      const key = recipientKey(message.to);

      let reservedId: number | null;
      try {
        // The ceiling first: it is the cheaper question, and a system already at
        // its limit should not be taking per-recipient locks to find that out.
        const sentOverall = await repo.countAll(new Date(at.getTime() - ceilingWindowMs));
        if (sentOverall >= outboundCeiling) {
          log(`${CEILING_TRIPPED}: ${sentOverall} sends in the window, limit ${outboundCeiling}`);
          return {
            outcome: "refused",
            reason: "outbound ceiling reached",
          };
        }

        reservedId = await repo.reserveForRecipient({
          recipientKey: key,
          since: new Date(at.getTime() - recipientWindowMs),
          limit: recipientCap,
        });
      } catch (error) {
        // Fail closed. The control cannot be enforced, so nothing is sent —
        // and the caller reached this point only because a database was already
        // working moments ago, so the cost of refusing is near zero while
        // failing open would remove the control precisely during an incident.
        const reason = error instanceof Error ? error.message : "cap unavailable";
        log(`[mail:cap] refusing because the control could not be enforced: ${reason}`);
        return { outcome: "refused", reason: "send cap unavailable" };
      }

      if (reservedId === null) {
        return { outcome: "refused", reason: "recipient send cap reached" };
      }

      const result = await inner.send(message);

      try {
        await repo.setOutcome(reservedId, result.outcome);
      } catch {
        // The attempt is already counted, which is what the controls need. A
        // failure to correct its outcome costs a diagnostic, never a guarantee.
        log(`[mail:cap] could not record the outcome of attempt ${reservedId}`);
      }

      return result;
    },
  };
};
