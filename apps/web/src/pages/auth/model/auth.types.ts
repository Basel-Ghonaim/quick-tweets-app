import type { JourneyPhase } from "@features/journey";

/** How far the reader has got, as the progress display reports it. */
export type StepState = "done" | "current" | "optional" | "skipped";

/** The journey is three fixed steps, and these are their identities. */
export type JourneyStepId = "account" | "profile" | "verify";

/** Where the reader stands, in the progress display's own vocabulary. */
export type StepPosition = "account" | JourneyPhase;
