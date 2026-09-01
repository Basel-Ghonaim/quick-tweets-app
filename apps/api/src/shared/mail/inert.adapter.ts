/**
 * The inert mail backend: accepts and discards the message, reporting success so
 * callers exercise their normal path without a transport or credentials.
 */

import type { MailAdapter, MailMessage, MailResult } from "./mail.types.js";

export interface InertMailAdapterOptions {
  log?: (message: string) => void;
}

export const createInertMailAdapter = (
  options: InertMailAdapterOptions = {},
): MailAdapter => {
  const log = options.log ?? ((message: string) => console.log(message));

  return {
    send: async (message: MailMessage): Promise<MailResult> => {
      // The body is withheld — it may carry a single-use secret.
      log(
        `[mail:inert] discarded a message to ${message.to} — subject: ${message.subject}`,
      );
      return { outcome: "accepted" };
    },
  };
};
