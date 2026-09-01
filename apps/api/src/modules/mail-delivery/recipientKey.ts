/**
 * The key an attempt is counted under.
 *
 * Two properties, and the reasoning for each is the whole of this unit.
 *
 * **Lowercased, and nothing more.** Without it, one recipient reached as
 * `User@x.test` and `user@x.test` would be two keys and the cap would not hold.
 * Stripping dots or plus-tags is deliberately *not* done: those mean different
 * things at different providers, and a sender that guessed would merge two
 * genuinely distinct recipients into one bucket.
 *
 * **Digested, so the address is never stored.** The controls only ever ask
 * whether two attempts share a recipient, which equality of the digest answers
 * exactly. Keeping the address would accumulate every recipient ever mailed for
 * no capability the controls actually use.
 */

import { createHash } from "node:crypto";

/** A recipient reduced to what the controls need: an opaque, stable equality. */
export const recipientKey = (address: string): string =>
  createHash("sha256").update(address.toLowerCase()).digest("hex");
