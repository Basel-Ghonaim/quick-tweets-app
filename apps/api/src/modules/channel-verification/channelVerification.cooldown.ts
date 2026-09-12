/**
 * Channel Verification — the resend window, derived in one place.
 *
 * Three sites answer with what remains of the cooldown: a successful issue, a
 * refusal inside the window, and the read. They share this file so the same
 * anchor cannot produce three slightly different numbers.
 */

/**
 * Whole seconds from `from` until `target`, never negative.
 *
 * Rounded up so a caller told `n` and waiting `n` is past the window rather
 * than a fraction short of it — the difference between one wasted refusal and
 * none.
 */
export const secondsUntil = (target: Date, from: Date): number =>
  Math.max(0, Math.ceil((target.getTime() - from.getTime()) / 1000));

/** When the subject anchored at `lastChallengedAt` may be challenged again. */
export const resendAvailableAt = (lastChallengedAt: Date, cooldownMs: number): Date =>
  new Date(lastChallengedAt.getTime() + cooldownMs);

/**
 * What remains of the window for a subject, `0` when none is running — which is
 * both "never challenged" and "the wait has passed", because a caller may resend
 * in either case.
 */
export const resendAvailableInSeconds = (
  lastChallengedAt: Date | null,
  cooldownMs: number,
  at: Date,
): number =>
  lastChallengedAt === null
    ? 0
    : secondsUntil(resendAvailableAt(lastChallengedAt, cooldownMs), at);
