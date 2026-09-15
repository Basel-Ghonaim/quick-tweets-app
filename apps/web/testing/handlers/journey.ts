import { http, HttpResponse } from "msw";
import { api } from "../api";

const JOURNEY = api("/onboarding/journey");

/** The success envelope the gateway unwraps: `{ success, data }`. */
export const journeyIs = (phase: string, profileOutcome: string | null = null) =>
  http.get(JOURNEY, () =>
    HttpResponse.json({ success: true, data: { phase, profileOutcome } }),
  );

/**
 * A refusal the read cannot recover from. `400` rather than a network error
 * because the retry interceptor retries network failures twice with real
 * backoff, and a test whose subject is not the retry pays three seconds for it.
 */
export const journeyRefuses = (status = 400) =>
  http.get(JOURNEY, () => new HttpResponse(null, { status }));
