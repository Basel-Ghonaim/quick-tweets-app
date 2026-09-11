import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { JourneyState } from "./journey.types";
import type { JourneyRepository } from "./JourneyRepository";

export const restJourney = (client = authClient): JourneyRepository => ({
  read: async () =>
    unwrap(await client.get<ApiEnvelope<JourneyState>>("/onboarding/journey")),

  advance: async (move) =>
    unwrap(await client.post<ApiEnvelope<JourneyState>>("/onboarding/journey/advance", move)),
});
