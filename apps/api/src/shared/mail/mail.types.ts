/**
 * The outbound-mail port — an implementation is the only code permitted to
 * reach a mail transport.
 *
 * Email-shaped rather than channel-agnostic, and owned here rather than by any
 * consumer: see ADR 0009 Decision 7.
 */

export interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

/** Failure is returned, never thrown, so a transport error cannot unwind work the caller already committed. */
export type MailResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export interface MailAdapter {
  /** Must not throw: foreseeable transport failures are reported as `{ ok: false }`. */
  send(message: MailMessage): Promise<MailResult>;
}
