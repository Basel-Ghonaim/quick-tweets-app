/**
 * The capture mail backend: writes the whole message to a local file so a person
 * can read what would have been sent.
 *
 * It exists because a code that is discarded on delivery and digested at rest is
 * knowable to nobody — which is the property that makes verification
 * trustworthy, and also what leaves hand-verification without an inbox. This is
 * that inbox, and it is a delivery concern rather than a reason to weaken the
 * capability or to fabricate state elsewhere.
 *
 * It writes a single-use secret to disk. Reaching it takes a deliberate, exact
 * opt-in outside production (see mail.mode), and its destination is gitignored.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MailAdapter, MailMessage, MailResult } from "./mail.types.js";

/** A convention, deliberately not a setting — one less thing to misconfigure. */
export const CAPTURE_DIRECTORY = ".mail-capture";

export interface CaptureMailAdapterOptions {
  dir?: string;
  now?: () => Date;
  log?: (message: string) => void;
}

/** Sortable by name, and safe on every filesystem we care about. */
const fileNameFor = (message: MailMessage, at: Date): string => {
  const stamp = at.toISOString().replace(/[:.]/g, "-");
  const recipient = message.to.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${stamp}-${recipient}.txt`;
};

const render = (message: MailMessage, at: Date): string =>
  [
    `Date: ${at.toISOString()}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    "",
    message.body,
    "",
  ].join("\n");

export const createCaptureMailAdapter = (
  options: CaptureMailAdapterOptions = {},
): MailAdapter => {
  const dir = options.dir ?? CAPTURE_DIRECTORY;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? ((message: string) => console.log(message));

  return {
    send: async (message: MailMessage): Promise<MailResult> => {
      const at = now();
      const file = path.join(dir, fileNameFor(message, at));

      try {
        await mkdir(dir, { recursive: true });
        await writeFile(file, render(message, at), "utf8");
      } catch (error) {
        // The port reports failure rather than raising it, so a caller's
        // committed work is never unwound by a delivery problem.
        return { ok: false, reason: error instanceof Error ? error.message : "write failed" };
      }

      log(`[mail:capture] wrote a message for ${message.to} to ${file}`);
      return { ok: true };
    },
  };
};
