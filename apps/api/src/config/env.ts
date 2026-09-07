/**
 * Environment configuration — type-safe via Zod.
 *
 * Current purpose:
 * - Parses and validates all required environment variables at startup
 * - Fails fast with a clear error if any variable is missing or invalid
 * - Exports a typed `env` object used across the entire backend
 *
 * Security notes:
 * - JWT_EXPIRES_IN defaults to "15m" (not "7d") — short-lived access tokens
 * - NODE_ENV controls cookie secure flag and other production behaviors
 * - CORS_ORIGIN controls allowed frontend origin (no hardcoding)
 *
 * Future expansion:
 * - Add REFRESH_TOKEN_SECRET for refresh token rotation
 * - Add rate limiting config (RATE_LIMIT_WINDOW, RATE_LIMIT_MAX)
 */

import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().default("15m"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    UPLOAD_DIR: z.string().default("./uploads"),
    // Media reclamation (M11). `report` is the FAIL-SAFE default: physical
    // deletion runs only when MEDIA_RECLAMATION_MODE is EXACTLY "destructive"
    // (see resolveReclamationMode) — a missing, empty, mis-cased, or misspelled
    // value resolves to `report`, so bad config can never silently enable
    // deletion. A permissive `string` (not an enum) so an unexpected value warns
    // and stays report rather than crashing. Window/cadence/batch are operational
    // tunables, not architectural invariants.
    MEDIA_RECLAMATION_MODE: z.string().default("report"),
    RECLAMATION_GRACE_MS: z.coerce.number().int().nonnegative().default(24 * 60 * 60 * 1000),
    RECLAMATION_INTERVAL_MS: z.coerce.number().int().positive().default(6 * 60 * 60 * 1000),
    RECLAMATION_BATCH: z.coerce.number().int().positive().default(100),
    // Permissive `string`, not an enum, because the value's fate depends on the
    // environment rather than on the schema: outside production an unexpected
    // one warns and stays inert, while production refuses anything that cannot
    // deliver. `resolveMailMode` owns that split.
    MAIL_MODE: z.string().default("inert"),
    // The SMTP transport. A provider is a host and a credential (ADR 0015
    // Decision 1), so these are all that changes when one is swapped. Optional
    // here and required by the refine below only when `smtp` is selected —
    // demanding credentials from a developer running inert would be noise.
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    // False selects STARTTLS, which the 587 submission port uses.
    SMTP_SECURE: z
      .string()
      .default("false")
      .transform((v) => v === "true"),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    // Providers commonly require this to be the authenticated identity, and
    // rewrite or reject anything else.
    MAIL_FROM: z.string().optional(),
    // Bounds the whole attempt. Without it a hung relay holds an HTTP request
    // open and delays shutdown, since nothing else caps it.
    MAIL_SEND_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    // The abuse controls the mail mechanism owns (ADR 0015 Decision 4).
    //
    // The recipient cap answers inbox flooding and is enforced exactly. The
    // ceiling answers spend and sender reputation, which are measured against
    // the sender and cannot be bounded by a recipient key.
    //
    // Two named limits, not one: a reserved floor for account recovery
    // (ADR 0015 Decision 6's condition, met by ADR 0016) means the cap a
    // consumer is admitted under is no longer a single number. MAIL_RECIPIENT_CAP
    // is the reserved ceiling; MAIL_RECIPIENT_CAP_GENERAL is what every other
    // consumer is admitted under, strictly below it, so the gap between the two
    // is what only the reserved consumer can claim. The window is shared —
    // both count the same per-recipient rolling budget, just admitted
    // differently.
    MAIL_RECIPIENT_CAP: z.coerce.number().int().positive().default(20),
    MAIL_RECIPIENT_CAP_GENERAL: z.coerce.number().int().positive().default(15),
    MAIL_RECIPIENT_CAP_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(24 * 60 * 60 * 1000),
    // Deliberately below a free tier's own daily allowance, so our breaker
    // trips first and visibly. A provider that refuses before we do governs
    // instead of us, and its refusal is not one we can alarm on.
    MAIL_OUTBOUND_CEILING: z.coerce.number().int().positive().default(200),
    MAIL_OUTBOUND_CEILING_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(24 * 60 * 60 * 1000),
    // How often spent attempts are swept, and how long one is kept.
    //
    // Hygiene, not correctness: the controls count inside their window, so an
    // attempt that has aged out is already irrelevant whether or not anything
    // removed it. Retention decides only how far back the controls can still
    // see — which is why it may never be shorter than a window (see the refine
    // below).
    MAIL_ATTEMPT_SWEEP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60 * 1000),
    MAIL_ATTEMPT_RETENTION_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 60 * 60 * 1000),
    // Crockford base32 — I/L/O/U are absent because the code is typed by hand.
    // 12 characters over 32 symbols is 60 bits, which keeps a fast digest out of
    // offline brute-force range. Configuration, not platform logic.
    CHANNEL_VERIFICATION_CODE_ALPHABET: z
      .string()
      .default("0123456789ABCDEFGHJKMNPQRSTVWXYZ"),
    CHANNEL_VERIFICATION_CODE_LENGTH: z.coerce.number().int().positive().default(12),
    // Covers received-then-typed, not worst-case delivery: a holder who never
    // receives the message waits out the cooldown and asks again, so a longer
    // window would only keep a leaked code useful.
    CHANNEL_VERIFICATION_CHALLENGE_TTL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    // The durable abuse control; the per-IP limiter is only the outer layer.
    CHANNEL_VERIFICATION_RESEND_COOLDOWN_MS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(60 * 1000),
    // How often spent challenges are swept (ms; default 6h). Hygiene, not
    // correctness — status is derived, so nothing depends on this having run.
    CHANNEL_VERIFICATION_SWEEP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60 * 1000),
    // How long a spent challenge is kept before removal (ms; default 7d). It
    // buys diagnostics only: the proof lives on the record and is never swept.
    //
    // `positive()` is load-bearing, not tidiness. The sweep deletes where
    // `closed_at < cutoff OR expires_at < cutoff`, and `cutoff = now - this`; a
    // negative value would push the cutoff into the future, where `expires_at <
    // cutoff` starts matching live, unexpired challenges. Rejecting it at
    // startup closes that permanently, with no runtime branch.
    CHANNEL_VERIFICATION_CHALLENGE_RETENTION_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 60 * 60 * 1000),
    // Password Reset's own configuration (ADR 0016 Decision 9) — never read
    // from, defaulted from, or falling back to any CHANNEL_VERIFICATION_*
    // variable. A shared setting would let one flow's retuning move the
    // other's security properties with neither owner seeing it happen.
    //
    // Shorter than verification's own TTL: this credential authorizes a
    // password change rather than reporting a status, so it is spendable for
    // less time than one that only proves control of an endpoint.
    RESET_CODE_TTL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 60 * 1000),
    // The durable abuse control; the per-IP limiter (WI-3) is only the outer
    // layer. Also what the request flow reads under its per-user advisory
    // lock to decide whether a resend is silently ignored.
    RESET_RESEND_COOLDOWN_MS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(60 * 1000),
    // Crockford base32 (no I/L/O/U): the actor retyping this is someone
    // already locked out, on a phone, more often than a signed-in holder.
    RESET_CODE_ALPHABET: z.string().default("0123456789ABCDEFGHJKMNPQRSTVWXYZ"),
    // 12 over 32 symbols is 60 bits — also why the design took a single
    // paste-friendly field over a segmented one; shortening this reopens that.
    RESET_CODE_LENGTH: z.coerce.number().int().positive().default(12),
    // How often spent/expired credentials are swept (ms; default 6h). Hygiene
    // only — usable/expired/spent is derived, so nothing depends on this
    // having run.
    RESET_CHALLENGE_SWEEP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60 * 1000),
    // How long a spent or expired credential is kept before removal (ms;
    // default 7d). Diagnostics only. `positive()` is load-bearing: the sweep
    // deletes where `used_at < cutoff OR expires_at < cutoff`, and a negative
    // value would push the cutoff into the future, matching live credentials.
    RESET_CHALLENGE_RETENTION_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 60 * 60 * 1000),
    // Bounds how far one position's expiry may be pushed forward, so a held key
    // cannot be renewed indefinitely. Not an abuse control; those sit beneath.
    RESET_MAX_RESENDS: z.coerce.number().int().nonnegative().default(3),
  })
  // Selecting a transport without the settings it needs is a misconfiguration,
  // and this project refuses to boot on those rather than failing at first use.
  // Scoped to `smtp` so the non-sending modes stay credential-free.
  .superRefine((cfg, ctx) => {
    if (cfg.MAIL_MODE !== "smtp") return;

    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"] as const) {
      if (!cfg[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when MAIL_MODE="smtp"`,
        });
      }
    }
  })
  // Retention may never be shorter than the longest window the controls count
  // over. If it were, the sweep would delete attempts a window still counts and
  // the caps would quietly under-enforce — no error, no log, just a control that
  // stopped binding because one number was lowered.
  //
  // Refused rather than clamped: substituting a value an operator did not choose
  // is the same class of quiet divergence, and startup is where this project
  // already puts misconfiguration.
  .superRefine((cfg, ctx) => {
    const longestWindow = Math.max(
      cfg.MAIL_RECIPIENT_CAP_WINDOW_MS,
      cfg.MAIL_OUTBOUND_CEILING_WINDOW_MS,
    );

    if (cfg.MAIL_ATTEMPT_RETENTION_MS < longestWindow) {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_ATTEMPT_RETENTION_MS"],
        message:
          `MAIL_ATTEMPT_RETENTION_MS (${cfg.MAIL_ATTEMPT_RETENTION_MS}ms) is shorter than the ` +
          `longest send window (${longestWindow}ms). The sweep would remove attempts the caps ` +
          `still count, and they would under-enforce silently.`,
      });
    }
  })
  // A reserve that is not strictly smaller than the cap it is carved out of
  // reserves nothing: every consumer would be admitted under the same number,
  // and the gap the reserved consumer depends on would not exist. Refused
  // rather than clamped, for the same reason as the guard above — a silently
  // substituted value hides exactly the misconfiguration this exists to catch.
  .superRefine((cfg, ctx) => {
    if (cfg.MAIL_RECIPIENT_CAP_GENERAL >= cfg.MAIL_RECIPIENT_CAP) {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_RECIPIENT_CAP_GENERAL"],
        message:
          `MAIL_RECIPIENT_CAP_GENERAL (${cfg.MAIL_RECIPIENT_CAP_GENERAL}) must be strictly less ` +
          `than MAIL_RECIPIENT_CAP (${cfg.MAIL_RECIPIENT_CAP}), or the reserved floor it is meant ` +
          `to carve out does not exist.`,
      });
    }
  })
  // Password Reset's cooldown is anchored on its most recent row, not on a
  // separate standing record the way Channel Verification's is — so, unlike
  // Channel Verification, a row surviving long enough for the NEXT request to
  // find it is what makes the cooldown hold at all. If retention could fall
  // below the cooldown, the sweep could remove a row before its own cooldown
  // window closes, and a resend arriving in that gap would misread as a
  // first-ever request — the cooldown silently defeated by an unrelated
  // setting, the same class of drift the mail retention guard above exists to
  // catch.
  .superRefine((cfg, ctx) => {
    if (cfg.RESET_CHALLENGE_RETENTION_MS < cfg.RESET_RESEND_COOLDOWN_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["RESET_CHALLENGE_RETENTION_MS"],
        message:
          `RESET_CHALLENGE_RETENTION_MS (${cfg.RESET_CHALLENGE_RETENTION_MS}ms) is shorter than ` +
          `RESET_RESEND_COOLDOWN_MS (${cfg.RESET_RESEND_COOLDOWN_MS}ms). The sweep could remove a ` +
          `row before its own cooldown window closes, and the cooldown would under-enforce silently.`,
      });
    }

    // The window now reaches a reader: a cooldown at or beyond the code's own
    // lifetime would name a moment the position has already lapsed past.
    if (cfg.RESET_RESEND_COOLDOWN_MS >= cfg.RESET_CODE_TTL_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["RESET_RESEND_COOLDOWN_MS"],
        message:
          `RESET_RESEND_COOLDOWN_MS (${cfg.RESET_RESEND_COOLDOWN_MS}ms) is not shorter than ` +
          `RESET_CODE_TTL_MS (${cfg.RESET_CODE_TTL_MS}ms). The position would lapse before its ` +
          `resend window opened, so a reader could never reach the control it reports.`,
      });
    }
  });

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
