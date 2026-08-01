/**
 * Backend selection. Fail-safe: an unrecognised value resolves to `inert` and
 * warns, so misconfiguration can neither crash startup nor silently select a
 * live transport.
 */

export type MailMode = "inert";

export const resolveMailMode = (
  raw: string | undefined,
  warn: (message: string) => void = (m) => console.warn(m),
): MailMode => {
  if (raw !== undefined && raw !== "inert") {
    warn(
      `[mail] MAIL_MODE="${raw}" is not recognised — defaulting to inert ` +
        `(no mail is sent)`,
    );
  }
  return "inert";
};
