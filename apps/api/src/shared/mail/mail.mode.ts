/**
 * Backend selection. Fail-safe: an unrecognised value resolves to `inert` and
 * warns, so misconfiguration can neither crash startup nor silently select a
 * live transport.
 *
 * `capture` writes a single-use secret to disk, so it is reachable only by an
 * exact opt-in outside production. Production asking for it is treated exactly
 * as any unrecognised value is — warn, resolve to `inert` — because a startup
 * crash over a mail setting is the worse failure. Nothing ever falls back *to*
 * capture.
 */

export type MailMode = "inert" | "capture" | "smtp";

export const resolveMailMode = (
  raw: string | undefined,
  nodeEnv: string,
  warn: (message: string) => void = (m) => console.warn(m),
): MailMode => {
  if (raw === "smtp") return "smtp";

  if (raw === "capture") {
    if (nodeEnv !== "production") return "capture";
    warn(
      `[mail] MAIL_MODE="capture" is refused in production — defaulting to inert ` +
        `(it would write single-use secrets to disk)`,
    );
    return "inert";
  }

  if (raw !== undefined && raw !== "inert") {
    warn(
      `[mail] MAIL_MODE="${raw}" is not recognised — defaulting to inert ` +
        `(no mail is sent)`,
    );
  }
  return "inert";
};
