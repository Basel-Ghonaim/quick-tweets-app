import type { ProfileOutcome } from "@features/journey";
import type { JourneyStepId, StepPosition, StepState } from "../../model";

export const JOURNEY_STEPS = ["account", "profile", "verify"] as const satisfies
  readonly JourneyStepId[];

const CURRENT_AT: Record<StepPosition, JourneyStepId | null> = {
  account: "account",
  profile: "profile",
  verify: "verify",
  code: "verify",
  none: null,
};

/**
 * A skipped step reads as skipped, never as complete — which is why the outcome
 * is the server's to hold rather than something a reload can lose.
 */
export const stepStates = (
  position: StepPosition,
  profileOutcome: ProfileOutcome | null,
): Record<JourneyStepId, StepState> => {
  const current = CURRENT_AT[position];
  const reached = current === null ? JOURNEY_STEPS.length : JOURNEY_STEPS.indexOf(current);

  return Object.fromEntries(
    JOURNEY_STEPS.map((id, index) => {
      if (index === reached) return [id, "current"];
      if (index > reached) return [id, "optional"];
      if (id === "profile" && profileOutcome === "skipped") return [id, "skipped"];
      return [id, "done"];
    }),
  ) as Record<JourneyStepId, StepState>;
};
