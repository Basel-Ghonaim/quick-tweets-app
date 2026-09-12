/**
 * Channel Verification — routes.
 *
 * The capability owns this surface rather than a feature owning it: a second
 * consumer (password reset) would otherwise have to route through the users
 * module to reach a platform capability. Media sets the same precedent by owning
 * its own ingest endpoint.
 *
 * - POST /challenges         → issueLimiter   → authGuard → controller.issue
 * - POST /challenges/confirm → confirmLimiter → authGuard → validate → controller.confirm
 * - GET  /challenges/current → apiLimiter     → authGuard → controller.current
 *
 * The read names its own limiter for the same reason the writes do: this prefix
 * carries no blanket cap, so a route that stated none would have none.
 */

import { Router } from "express";

import { authGuard } from "../../middleware/authGuard.js";
import {
  apiLimiter,
  verificationConfirmLimiter,
  verificationIssueLimiter,
} from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import { createChannelVerificationController } from "./channelVerification.controller.js";
import { confirmChallengeSchema } from "./channelVerification.validator.js";

const controller = createChannelVerificationController();

export const channelVerificationRoutes = Router();

channelVerificationRoutes.post("/challenges", verificationIssueLimiter, authGuard, controller.issue);

channelVerificationRoutes.get(
  "/challenges/current",
  apiLimiter,
  authGuard,
  controller.current,
);

channelVerificationRoutes.post(
  "/challenges/confirm",
  verificationConfirmLimiter,
  authGuard,
  validate(confirmChallengeSchema),
  controller.confirm,
);
