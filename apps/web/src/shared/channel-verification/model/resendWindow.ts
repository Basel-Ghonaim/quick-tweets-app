/**
 * The wire states a wait in seconds; the capability holds the instant it ends,
 * because a duration kept in memory decays while it sits there.
 */
export const resendWindowAt = (seconds: number, now = Date.now()): number | null =>
  seconds > 0 ? now + seconds * 1000 : null;

export const secondsUntilWindow = (at: number | null, now = Date.now()): number =>
  at === null ? 0 : Math.max(0, Math.ceil((at - now) / 1000));
