/**
 * The SMTP mail backend: the first that actually delivers.
 *
 * A provider is a host and a credential, never a dependency (ADR 0015
 * Decision 1) — nodemailer is a transport library, so any SMTP provider is a
 * change of configuration rather than of code.
 *
 * Its reason for existing is the classification below. A network transport can
 * fail in a way that leaves the outcome genuinely unknown, and reporting that
 * honestly is what the three-state result is for.
 */

import nodemailer, { type Transporter } from "nodemailer";

import type { MailAdapter, MailMessage, MailResult } from "./mail.types.js";

export interface SmtpMailAdapterOptions {
  host: string;
  port: number;
  /** Implicit TLS. False selects STARTTLS, which submission ports use. */
  secure: boolean;
  user: string;
  password: string;
  /** The envelope and header sender. Providers commonly require it to be the authenticated identity. */
  from: string;
  /** Bounds the whole attempt, so a hung relay cannot hold a request open. */
  timeoutMs: number;
  transport?: Transporter;
  log?: (message: string) => void;
}

/**
 * Whether a failure happened **before** the message body was handed over.
 *
 * This is the whole classification rule, and it is deliberately conservative:
 * only a failure that provably preceded the hand-off is a refusal. Everything
 * else is unknown, because once the body is in flight the relay may have
 * accepted it and lost the acknowledgement — and claiming it was not sent would
 * assert what we cannot know.
 *
 * The asymmetry is intended. An unnecessary `unknown` costs a log line; a wrong
 * `refused` costs the guarantee this result type exists to provide.
 */
const failedBeforeHandoff = (error: NodeJS.ErrnoException & { responseCode?: number }): boolean => {
  // Connection never established, or the greeting/handshake never completed.
  if (
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND" ||
    error.code === "EDNS" ||
    error.code === "ECONNECTION" ||
    error.code === "ETLS"
  ) {
    return true;
  }

  // The relay rejected us outright: authentication, or a permanent refusal of
  // the envelope. Both are answered before any body is transmitted.
  if (error.code === "EAUTH" || error.code === "EENVELOPE") return true;

  // A permanent status returned during the exchange is a decision, not silence.
  if (typeof error.responseCode === "number" && error.responseCode >= 500) return true;

  return false;
};

export const createSmtpMailAdapter = (options: SmtpMailAdapterOptions): MailAdapter => {
  const log = options.log ?? ((message: string) => console.log(message));

  const transport =
    options.transport ??
    nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      requireTLS: !options.secure,
      auth: { user: options.user, pass: options.password },
      connectionTimeout: options.timeoutMs,
      greetingTimeout: options.timeoutMs,
      socketTimeout: options.timeoutMs,
    });

  return {
    send: async (message: MailMessage): Promise<MailResult> => {
      try {
        await transport.sendMail({
          from: options.from,
          to: message.to,
          subject: message.subject,
          text: message.body,
        });

        // The relay took responsibility. That is acceptance, not delivery, and
        // the name says so.
        log(`[mail:smtp] relay accepted a message for ${message.to}`);
        return { outcome: "accepted" };
      } catch (error) {
        const err = error as NodeJS.ErrnoException & { responseCode?: number };
        const reason = err.message || "send failed";

        if (failedBeforeHandoff(err)) {
          log(`[mail:smtp] refused for ${message.to}: ${reason}`);
          return { outcome: "refused", reason };
        }

        // A timeout, a dropped socket, or anything else that leaves the
        // exchange unfinished. The message may or may not have been relayed.
        log(`[mail:smtp] outcome unknown for ${message.to}: ${reason}`);
        return { outcome: "unknown", reason };
      }
    },
  };
};
