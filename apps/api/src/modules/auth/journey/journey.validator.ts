/**
 * Onboarding Journey — request validation.
 *
 * The target is a closed set, so an unknown value is a malformed request and is
 * refused here with field errors. Whether a *known* target is available from
 * where the reader stands is not validation — it is the journey's own rule, and
 * it answers with a conflict rather than a validation failure.
 *
 * Leaving the profile step carries how it was left; no other move does. The
 * refusal below is explicit because a plain object *strips* what it does not
 * recognise, so silence here would let a client assert an outcome for a step
 * whose outcome the server derives.
 */

import { z } from "zod";

const CHOOSE_A_STEP = "Choose a step to move to.";

const NOT_ASSERTABLE = "This step's outcome is not the client's to state.";

export const advanceJourneySchema = z.discriminatedUnion(
  "to",
  [
    z.object({
      to: z.literal("verify"),
      outcome: z.enum(["saved", "skipped"], {
        error: "Say whether the profile was saved or skipped.",
      }),
    }),
    z.object({
      to: z.literal("code"),
      outcome: z.never({ error: NOT_ASSERTABLE }).optional(),
    }),
    z.object({
      to: z.literal("completed"),
      outcome: z.never({ error: NOT_ASSERTABLE }).optional(),
    }),
  ],
  { error: CHOOSE_A_STEP },
);
