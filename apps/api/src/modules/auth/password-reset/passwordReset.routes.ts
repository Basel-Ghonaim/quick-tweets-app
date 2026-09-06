/**
 * Password Reset — the router, mounted under Auth's own prefix.
 *
 * **No `authGuard` on any route, by design (I3).** The actor here is whoever
 * holds the code; requiring a session would exclude precisely the people the
 * capability exists for. That absence is the invariant, so it is stated rather
 * than left to be noticed.
 *
 * The chain is limiter → validate → controller, as everywhere else. Validation
 * of the submitted code is presence-only; its shape is the capability's to
 * judge, where every unusable code collapses into one outcome.
 */

import { Router } from "express";

import {
  passwordResetApplyLimiter,
  passwordResetConfirmLimiter,
  passwordResetRequestLimiter,
} from "../../../middleware/rateLimiter.js";
import { validate } from "../../../middleware/validate.js";
import { createPasswordResetController } from "./passwordReset.controller.js";
import type { ProveChannel } from "./passwordReset.types.js";
import {
  applyResetSchema,
  confirmResetSchema,
  requestResetSchema,
} from "./passwordReset.validator.js";

export const createPasswordResetRoutes = (
  proveChannel: ProveChannel,
): Router => {
  const controller = createPasswordResetController(proveChannel);

  const passwordResetRoutes = Router();

  passwordResetRoutes.post(
    "/",
    passwordResetRequestLimiter,
    validate(requestResetSchema),
    controller.request,
  );

  passwordResetRoutes.post(
    "/confirm",
    passwordResetConfirmLimiter,
    validate(confirmResetSchema),
    controller.confirm,
  );

  /* Reading a position spends nothing and checks no secret, so it earns no
   limiter of its own beyond the prefix it sits behind. */
  passwordResetRoutes.get("/session", controller.position);

  passwordResetRoutes.post(
    "/apply",
    passwordResetApplyLimiter,
    validate(applyResetSchema),
    controller.apply,
  );

  return passwordResetRoutes;
};
