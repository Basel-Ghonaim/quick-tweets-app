/**
 * Onboarding Journey — the router, built rather than exported ready-made.
 *
 * The probe arrives from outside, which is what keeps this capability free of
 * any import of the subsystem that owns verification (asserted by
 * `journey.noVerificationImport.test.ts`). The composition root is the one
 * place that knows both, and that is its job.
 *
 * Both routes carry `authGuard`: the journey is the reader's own, and the
 * account it belongs to is the token's, never the request's to name.
 *
 * The prefix limiter is the right tier and is applied where the router is
 * mounted, not here. Neither route spends an external resource nor checks a
 * secret, so neither earns the per-route limiters password reset needs — and
 * mounting under a limited prefix is what stops a later route being added with
 * no limit at all.
 */

import { Router } from "express";

import { authGuard } from "../../../middleware/authGuard.js";
import { validate } from "../../../middleware/validate.js";
import { createJourneyController } from "./journey.controller.js";
import { advanceJourneySchema } from "./journey.validator.js";
import type { VerificationProbe } from "./journey.types.js";

export const createJourneyRoutes = (hasLiveChallenge: VerificationProbe): Router => {
  const controller = createJourneyController(hasLiveChallenge);
  const routes = Router();

  routes.get("/journey", authGuard, controller.read);

  routes.post(
    "/journey/advance",
    authGuard,
    validate(advanceJourneySchema),
    controller.advance,
  );

  return routes;
};
