/**
 * Password Reset — the HTTP boundary.
 *
 * Unauthenticated throughout (I3): the actor is whoever holds the code, never
 * a session. Two things happen here and nowhere else — the neutral response
 * is committed to the wire, and the mail send is dispatched only once that
 * response has left (D3).
 */

import type { CookieOptions, NextFunction, Request, Response } from "express";

import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/index.js";
import { sendSuccess } from "../../../shared/response/index.js";
import { PasswordResetError } from "./passwordReset.errors.js";
import { createPasswordResetService } from "./passwordReset.service.js";
import type { IPasswordResetService, ProveChannel } from "./passwordReset.types.js";

/**
 * The key addressing a reader's position. `httpOnly` is the whole point — the
 * client never reads it, so no script can lift the credential it stands for.
 *
 * `path` scopes it to this capability, so it is never sent to any other route;
 * `sameSite: "strict"` keeps it off cross-site requests entirely.
 */
export const SESSION_COOKIE = "qt_reset";

const cookieOptions = (maxAgeMs?: number): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth/password-reset",
  ...(maxAgeMs === undefined ? {} : { maxAge: maxAgeMs }),
});

/**
 * Translate the capability's transport-agnostic errors, leaving anything else
 * for the global handler.
 *
 * `not_usable` is every way a code can fail — never issued, expired, spent,
 * malformed, or simply wrong — and it becomes one status with one message.
 * There is deliberately no second branch to add a carve-out to.
 *
 * `invalid_format` is **not** translated. It means the configured alphabet or
 * length could not produce a code at all, which is an operator fault, not a
 * caller's; surfacing it as an unhandled `500` is the correct visibility, and
 * mapping it here would let a misconfigured deployment be diagnosed as a
 * holder mistyping. Channel Verification excludes its own configuration fault
 * from the same collapse for the same reason.
 */
const asHttpError = (err: unknown): unknown => {
  if (err instanceof PasswordResetError && err.code === "not_usable") {
    return AppError.badRequest("That reset code is not valid.");
  }
  return err;
};

export const createPasswordResetController = (
  proveChannel: ProveChannel,
  service: IPasswordResetService = createPasswordResetService({ proveChannel }),
) => ({
  /**
   * POST /auth/password-reset
   *
   * Answers identically whether the address belongs to no account, to an
   * account eligible for a fresh code, or to an account still inside its
   * cooldown (I5). The body is a constant: there is no delivery outcome, no
   * remaining-cooldown hint and no `Retry-After`, because each of those would
   * be the disclosure the neutrality exists to prevent.
   */
  request: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dispatchSend, sessionKey, position } = await service.request({
        email: String(req.body.email),
        sessionKey: req.cookies?.[SESSION_COOKIE] as string | undefined,
      });

      // Set on every branch alike, and before the body is written: a cookie
      // present for one address and absent for another would be the
      // disclosure the constant body exists to prevent.
      res.cookie(SESSION_COOKIE, sessionKey, cookieOptions(env.RESET_CODE_TTL_MS));

      if (dispatchSend) {
        // After the response is flushed, never inside it (D3). The send is a
        // network round trip whose duration would otherwise be measurable,
        // and only one of the three branches has one to make — so awaiting it
        // here would turn the timing into the oracle the constant body denies.
        // `finish` fires once the last byte is handed to the socket.
        res.on("finish", () => {
          // The thunk swallows its own transport failure: nothing about
          // delivery may reach the caller, and by now nothing can.
          void dispatchSend();
        });
      }

      sendSuccess(res, position, 202);
    } catch (err) {
      next(asHttpError(err));
    }
  },

  /**
   * POST /auth/password-reset/confirm
   *
   * Reports whether the submitted code is currently usable, and consumes
   * nothing (D6) — the same code confirmed twice reports usable both times.
   */
  confirm: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.confirm({
        code: String(req.body.code),
        sessionKey: req.cookies?.[SESSION_COOKIE] as string | undefined,
      });

      sendSuccess(res, null, 204);
    } catch (err) {
      next(asHttpError(err));
    }
  },

  /**
   * POST /auth/password-reset/apply
   *
   * Spends the code, writes the new password and revokes every session, all
   * in one transaction. Returns no session of its own: the flow ends at Login
   * (D2), and the sessions being revoked may be the attacker's.
   */
  /**
   * GET /auth/password-reset/session
   *
   * Where the reader stands, and the masked address they used. There is no
   * `404`: an absent or lapsed position is a legitimate answer meaning *start
   * at the beginning*, so a client never reads a status to decide a screen.
   */
  position: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const position = await service.positionOf(
        req.cookies?.[SESSION_COOKIE] as string | undefined,
      );

      sendSuccess(res, position);
    } catch (err) {
      next(err);
    }
  },

  apply: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.apply({
        sessionKey: req.cookies?.[SESSION_COOKIE] as string | undefined,
        newPassword: String(req.body.newPassword),
      });

      // Cleared with the attributes it was set with, or the browser keeps it.
      res.clearCookie(SESSION_COOKIE, cookieOptions());

      sendSuccess(res, null, 204);
    } catch (err) {
      next(asHttpError(err));
    }
  },
});
