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
 */

import { Router } from "express";

import { authGuard } from "../../middleware/authGuard.js";
import {
  verificationConfirmLimiter,
  verificationIssueLimiter,
} from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import { createChannelVerificationController } from "./channelVerification.controller.js";
import { confirmChallengeSchema } from "./channelVerification.validator.js";

const controller = createChannelVerificationController();

export const channelVerificationRoutes = Router();

channelVerificationRoutes.post("/challenges", verificationIssueLimiter, authGuard, controller.issue);

channelVerificationRoutes.post(
  "/challenges/confirm",
  verificationConfirmLimiter,
  authGuard,
  validate(confirmChallengeSchema),
  controller.confirm,
);
