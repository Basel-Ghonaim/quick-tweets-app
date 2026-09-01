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

/**
 * What a send is known to have achieved.
 *
 * Three outcomes rather than two, because a transport produces three. A timeout
 * is **ignorance, not failure**: the relay may already have taken the message,
 * so collapsing it into a failure would report something no backend can know
 * (ADR 0015 Decision 9). Which conditions map to which outcome is the
 * classification rule, and it is documented in `docs/backend/mail.md`.
 *
 * The port carries no transport diagnostic — no response code, nothing
 * provider-shaped. `reason` is the whole of what a caller learns.
 */
export type MailOutcome = "accepted" | "refused" | "unknown";

/** Failure is returned, never thrown, so a transport error cannot unwind work the caller already committed. */
export type MailResult =
  | { readonly outcome: "accepted" }
  | { readonly outcome: "refused"; readonly reason: string }
  | { readonly outcome: "unknown"; readonly reason: string };

export interface MailAdapter {
  /** Must not throw: a foreseeable transport failure is reported as a result, never raised. */
  send(message: MailMessage): Promise<MailResult>;
}
