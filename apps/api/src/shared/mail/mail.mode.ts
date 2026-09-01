/**
 * Backend selection.
 *
 * **Outside production the resolution is fail-safe**: an unrecognised value
 * warns and resolves to `inert`, so a mistyped setting can neither crash a
 * developer's server nor silently select a live transport.
 *
 * **In production a mode must be able to deliver, or the process does not
 * start.** The fail-safe rule was sound while nothing could send: a fallback
 * that delivers nothing costs nothing. It stopped being sound the moment a
 * backend could, because `inert` does not merely fail — it reports success, so
 * a misconfigured deployment would send nothing while telling every caller it
 * had. A fail-safe default is safe only until it manufactures a false claim
 * (ADR 0015 Decision 3).
 *
 * The requirement is stated positively — *can this mode deliver?* — so a future
 * non-delivering backend is refused without anyone remembering to list it.
 * `capture`, which writes single-use secrets to disk, is refused there as a
 * consequence rather than as a special case.
 */

export type MailMode = "inert" | "capture" | "smtp";

/**
 * Whether a mode reaches a real recipient.
 *
 * Exhaustive over `MailMode` on purpose: a new backend cannot be added without
 * declaring this, because omitting it fails to compile. That is what makes the
 * production rule hold by construction rather than by review.
 */
const DELIVERS: Record<MailMode, boolean> = {
  inert: false,
  capture: false,
  smtp: true,
};

/** Raised at import, so a production misconfiguration stops the boot rather than the first send. */
export class MailModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailModeError";
    Object.setPrototypeOf(this, MailModeError.prototype);
  }
}

export const resolveMailMode = (
  raw: string | undefined,
  nodeEnv: string,
  warn: (message: string) => void = (m) => console.warn(m),
): MailMode => {
  const production = nodeEnv === "production";

  // What the value asks for, before any judgement about whether it is allowed.
  // An absent variable is the documented default rather than a mistake, so it
  // asks for `inert` and is not warned about; anything else unrecognised is.
  const requested: MailMode | null =
    raw === undefined || raw === "inert"
      ? "inert"
      : raw === "smtp"
        ? "smtp"
        : raw === "capture"
          ? "capture"
          : null;

  if (production) {
    // Nothing falls back in production: a fallback is how the silent outage
    // this rule exists to prevent would arrive.
    if (requested === null) {
      throw new MailModeError(
        `[mail] MAIL_MODE="${raw}" is not recognised, and production requires a mode that can deliver. ` +
          `Set it to a delivering mode and provide its settings.`,
      );
    }
    if (!DELIVERS[requested]) {
      throw new MailModeError(
        `[mail] MAIL_MODE="${requested}" cannot deliver, and production requires a mode that can. ` +
          `It would send nothing while reporting success.`,
      );
    }
    return requested;
  }

  if (requested !== null) return requested;

  warn(
    `[mail] MAIL_MODE="${raw}" is not recognised — defaulting to inert ` +
      `(no mail is sent)`,
  );
  return "inert";
};
