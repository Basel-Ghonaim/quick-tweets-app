/**
 * Onboarding Journey — request validation.
 *
 * The target is a closed set, so an unknown value is a malformed request and is
 * refused here with field errors. Whether a *known* target is available from
 * where the reader stands is not validation — it is the journey's own rule, and
 * it answers with a conflict rather than a validation failure.
 */

import { z } from "zod";

export const advanceJourneySchema = z.object({
  to: z.enum(["verify", "code", "completed"], {
    error: "Choose a step to move to.",
  }),
});
