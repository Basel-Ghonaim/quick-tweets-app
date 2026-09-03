/**
 * The mechanism's published surface: consumers take an adapter from here and
 * never reach a backend directly, so selecting a different one changes nothing
 * above this line.
 */

import { env } from "../../config/env.js";
import { createCaptureMailAdapter } from "./capture.adapter.js";
import { createInertMailAdapter } from "./inert.adapter.js";
import { createCappedMailAdapter } from "./capped.adapter.js";
import { createMailSendAttemptRepository } from "./mailSendAttempt.repository.js";
import { resolveMailMode, type MailMode } from "./mail.mode.js";
import { createSmtpMailAdapter } from "./smtp.adapter.js";
import type { MailAdapter } from "./mail.types.js";

const BACKENDS: Record<MailMode, () => MailAdapter> = {
  inert: () => createInertMailAdapter(),
  capture: () => createCaptureMailAdapter(),
  // The settings are guaranteed present by the environment schema, which
  // refuses to parse when this mode is selected without them.
  smtp: () =>
    createSmtpMailAdapter({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER!,
      password: env.SMTP_PASSWORD!,
      from: env.MAIL_FROM!,
      timeoutMs: env.MAIL_SEND_TIMEOUT_MS,
    }),
};

// Resolved once, not per call, so a misconfigured value warns at startup rather
// than on every send.
const CONFIGURED_MODE = resolveMailMode(env.MAIL_MODE, env.NODE_ENV);

/**
 * The mechanism's published surface.
 *
 * Every backend is wrapped in the abuse controls, so the same path runs under
 * all of them: the control is exercised constantly rather than meeting
 * production for the first time, and a backend added later inherits it without
 * doing anything.
 */
export const createMailAdapter = (
  mode: MailMode = CONFIGURED_MODE,
  recipientCap: number = env.MAIL_RECIPIENT_CAP_GENERAL,
): MailAdapter =>
  createCappedMailAdapter(BACKENDS[mode](), {
    repo: createMailSendAttemptRepository(),
    recipientCap,
    recipientWindowMs: env.MAIL_RECIPIENT_CAP_WINDOW_MS,
    outboundCeiling: env.MAIL_OUTBOUND_CEILING,
    ceilingWindowMs: env.MAIL_OUTBOUND_CEILING_WINDOW_MS,
  });

export type { MailAdapter, MailMessage, MailOutcome, MailResult } from "./mail.types.js";
