/**
 * Password Reset — the HTTP boundary.
 *
 * Unauthenticated throughout (I3): the actor is whoever holds the code, never
 * a session. Two things happen here and nowhere else — the neutral response
 * is committed to the wire, and the mail send is dispatched only once that
 * response has left (D3).
 */

import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../../shared/errors/index.js";
import { sendSuccess } from "../../../shared/response/index.js";
import { PasswordResetError } from "./passwordReset.errors.js";
import { createPasswordResetService } from "./passwordReset.service.js";
import type { IPasswordResetService } from "./passwordReset.types.js";

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
  service: IPasswordResetService = createPasswordResetService(),
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
      const { dispatchSend } = await service.request({ email: String(req.body.email) });

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

      sendSuccess(res, null, 202);
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
      await service.confirm({ code: String(req.body.code) });

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
  apply: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.apply({
        code: String(req.body.code),
        newPassword: String(req.body.newPassword),
      });

      sendSuccess(res, null, 204);
    } catch (err) {
      next(asHttpError(err));
    }
  },
});
