/**
 * Password Reset — the request / confirm / apply lifecycle.
 *
 * The capability produces one fact — a bearer is currently authorized to set
 * a new password (ADR 0016 Decision 1) — and is unauthenticated throughout:
 * the actor is whoever holds the code, never a session.
 *
 * Neutrality (I5) governs `request` end to end: an unknown address, a known
 * address still inside its cooldown, and a known-and-eligible address must
 * be indistinguishable from outside this module in everything but which one
 * of them actually causes a code to reach an inbox.
 */

import bcrypt from "bcrypt";

import { env } from "../../config/env.js";
import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import { createMailAdapter, type MailAdapter } from "../mail-delivery/index.js";
import { createAuthRepository, createTokenRepository } from "./auth.repository.js";
import { SALT_ROUNDS } from "./auth.service.js";
import type { IAuthRepository, ITokenRepository } from "./auth.types.js";
import {
  digestResetCode,
  mintResetCode,
  resetCode,
} from "./passwordReset.codes.js";
import { PasswordResetError } from "./passwordReset.errors.js";
import { createPasswordResetRepository } from "./passwordReset.repository.js";
import type {
  ApplyResetInput,
  ConfirmResetInput,
  IPasswordResetRepository,
  IPasswordResetService,
  RequestResetInput,
  RequestResetOutcome,
  ResetCode,
  ResetCodeFormat,
} from "./passwordReset.types.js";

/**
 * The response floor (D3), absorbing the credential-write asymmetry between
 * branches now that the mail send is no longer inside the timed path at all.
 * Not configuration (D1 names four values; this is not one of them) — a
 * mechanism constant, injectable only for tests.
 */
const DEFAULT_RESPONSE_FLOOR_MS = 250;

export interface PasswordResetServiceDeps {
  repo?: IPasswordResetRepository;
  authRepo?: IAuthRepository;
  tokenRepo?: ITokenRepository;
  mail?: MailAdapter;
  runInTransaction?: RunInTransaction;
  now?: () => Date;
  /** Injectable so tests do not actually wait out the floor. */
  wait?: (ms: number) => Promise<void>;
  format?: ResetCodeFormat;
  ttlMs?: number;
  cooldownMs?: number;
  responseFloorMs?: number;
}

const composeMessage = (code: ResetCode) => ({
  subject: "Reset your password",
  body: `Your password reset code is ${code}. It expires shortly; if you did not request this, ignore this message.`,
});

const realWait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createPasswordResetService = (
  deps: PasswordResetServiceDeps = {},
): IPasswordResetService => {
  const repo = deps.repo ?? createPasswordResetRepository();
  const authRepo = deps.authRepo ?? createAuthRepository();
  const tokenRepo = deps.tokenRepo ?? createTokenRepository();
  // The reserved limit, explicitly: this is the consumer ADR 0015 Decision 6
  // and ADR 0016 named the reserve for. Composed here, not left to the
  // adapter's own default, so the reservation is visible at the one call
  // site that is actually entitled to it.
  const mail = deps.mail ?? createMailAdapter(undefined, env.MAIL_RECIPIENT_CAP);
  const now = deps.now ?? (() => new Date());
  const wait = deps.wait ?? realWait;
  const runTransaction = deps.runInTransaction ?? defaultRunInTransaction;
  const format = deps.format ?? {
    alphabet: env.RESET_CODE_ALPHABET,
    length: env.RESET_CODE_LENGTH,
  };
  const ttlMs = deps.ttlMs ?? env.RESET_CODE_TTL_MS;
  const cooldownMs = deps.cooldownMs ?? env.RESET_RESEND_COOLDOWN_MS;
  const responseFloorMs = deps.responseFloorMs ?? DEFAULT_RESPONSE_FLOOR_MS;

  /**
   * Look up the row a submitted code identifies, collapsing every way a
   * lookup can fail into one opaque outcome — mirroring Channel
   * Verification's own confirmationFailed: a malformed value, an unknown
   * digest, an expired row and a used row are indistinguishable to a caller.
   *
   * No constant-time comparison here, unlike Channel Verification's own
   * lookup: that module resolves a subject first and then compares one
   * submitted secret against that one record's stored digest, where a
   * byte-by-byte timing difference could leak which bytes were closer to
   * right. This module looks up **by digest** — the attacker already
   * computed the exact digest their own guess produces, and SHA-256's
   * avalanche property means a database index match or non-match carries no
   * information about which plaintext bytes were close. The only bit this
   * lookup can ever reveal is "usable or not," which the opaque failure
   * already discloses by design.
   */
  const findUsable = async (submitted: string) => {
    let validated: ResetCode;
    try {
      validated = resetCode(submitted, format);
    } catch {
      throw PasswordResetError.notUsable();
    }

    const row = await repo.findByCodeHash(digestResetCode(validated));
    if (row === null) throw PasswordResetError.notUsable();
    if (row.usedAt !== null) throw PasswordResetError.notUsable();
    if (row.expiresAt.getTime() <= now().getTime()) throw PasswordResetError.notUsable();

    return row;
  };

  const request: IPasswordResetService["request"] = async ({ email }: RequestResetInput) => {
    const start = now();

    const user = await authRepo.findByEmail(email);

    let dispatchSend: (() => Promise<void>) | undefined;

    if (user !== null) {
      const minted = await runTransaction(async (tx) => {
        await repo.lockUser(user.id, tx);
        const mostRecent = await repo.findMostRecentForUser(user.id, tx);

        // Still inside the cooldown: do nothing, indistinguishably from an
        // unknown address (I5). The endpoint is anonymous, so a distinct
        // response here — Channel Verification's own authenticated pattern
        // — would itself disclose that this address exists.
        if (
          mostRecent !== null &&
          start.getTime() - mostRecent.createdAt.getTime() < cooldownMs
        ) {
          return null;
        }

        const code = mintResetCode(format);
        await repo.createChallenge(
          {
            userId: user.id,
            codeHash: digestResetCode(code),
            expiresAt: new Date(start.getTime() + ttlMs),
          },
          tx,
        );
        return code;
      });

      if (minted !== null) {
        // Composed against the account's own stored address, not whatever
        // the caller submitted — the two are equal whenever the lookup
        // succeeded, and the record is the source of truth for its own
        // value. Sent after this function returns (D3): the caller invokes
        // it, never this module, and never before the response is out.
        dispatchSend = async () => {
          try {
            await mail.send({ to: user.email, ...composeMessage(minted) });
          } catch {
            // Swallowed deliberately: the response never carries a delivery
            // outcome (D3), so there is nothing here for a caller to learn.
            // A fresh request supersedes a lost send.
          }
        };
      }
    }

    // Applied uniformly, regardless of which branch ran above — the floor
    // that makes the credential write's own latency (a locked insert, far
    // faster than a network round trip) immaterial to the response's timing.
    const elapsed = now().getTime() - start.getTime();
    if (elapsed < responseFloorMs) {
      await wait(responseFloorMs - elapsed);
    }

    const outcome: RequestResetOutcome = dispatchSend ? { dispatchSend } : {};
    return outcome;
  };

  const confirm: IPasswordResetService["confirm"] = async ({ code }: ConfirmResetInput) => {
    await findUsable(code);
  };

  const apply: IPasswordResetService["apply"] = async ({ code, newPassword }: ApplyResetInput) => {
    // Hashed before any transaction opens, mirroring registration's own
    // reasoning: bcrypt is ~250ms and must not hold a database connection
    // open for the duration.
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    return runTransaction(async (tx) => {
      const row = await findUsable(code);

      // Conditional on the row still being unused: single use is decided by
      // this write, not by the read above, so two callers racing on one
      // code cannot both succeed (mirrors Channel Verification's own
      // closeChallenge).
      const consumed = await repo.markUsed(row.id, new Date(), tx);
      if (consumed === 0) throw PasswordResetError.notUsable();

      await authRepo.updatePasswordHash(row.userId, passwordHash, tx);
      // Unconditional on success (D2/I7): a credential change that left old
      // sessions alive would leave whoever it was invoked against — an
      // attacker, in the case this exists for — still signed in.
      await tokenRepo.deleteAllUserTokens(row.userId, tx);

      return { userId: row.userId };
    });
  };

  return { request, confirm, apply };
};
