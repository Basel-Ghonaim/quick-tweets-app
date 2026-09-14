import type { JourneyPhase } from "@features/journey";

/** What the onboarding route shows, or where it sends the reader instead. */
export type Destination = "pending" | "retry" | "signin" | "feed" | JourneyPhase;
