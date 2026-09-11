import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { JourneyState } from "./journey.types";
import type { JourneyRepository } from "./JourneyRepository";

// The only repository here that holds its own request rather than composing one
// from `shared/api`: the journey is this feature's alone and nothing else reads it.
export const restJourney = (client = authClient): JourneyRepository => ({
  read: async () =>
    unwrap(await client.get<ApiEnvelope<JourneyState>>("/onboarding/journey")),

  advance: async (move) =>
    unwrap(await client.post<ApiEnvelope<JourneyState>>("/onboarding/journey/advance", move)),
});
