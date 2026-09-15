import { http, HttpResponse } from "msw";
import { api } from "../api";

const JOURNEY = api("/onboarding/journey");
const ADVANCE = api("/onboarding/journey/advance");

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

/** What a move answers. `resolveJourney` asks for one at `verify`. */
export const journeyAdvancesTo = (phase: string, profileOutcome: string | null = null) =>
  http.post(ADVANCE, () =>
    HttpResponse.json({ success: true, data: { phase, profileOutcome } }),
  );

/** A read left open, so the screen stays on the state it shows while waiting. */
export const journeyNeverAnswers = () =>
  http.get(JOURNEY, () => new Promise<never>(() => {}));

/**
 * A move that keeps what it was sent. What a capability carries to the server
 * is its own behaviour, and the wire is where that is observable — a double
 * would only report what the caller handed it.
 */
export const recordingMoves = (phase = "profile", profileOutcome: string | null = null) => {
  const moves: unknown[] = [];

  return {
    moves,
    handler: http.post(ADVANCE, async ({ request }) => {
      moves.push(await request.json());
      return HttpResponse.json({ success: true, data: { phase, profileOutcome } });
    }),
  };
};

/** A move left open, so a caller that does not wait for it can be seen not to. */
export const moveNeverAnswers = () =>
  http.post(ADVANCE, () => new Promise<never>(() => {}));

export const moveRefuses = (status = 400) =>
  http.post(ADVANCE, () => new HttpResponse(null, { status }));

/** Counts the reads that actually reached the network, which is what "asked
 *  once" means: a double counts calls, and this counts requests. */
export const countingReads = () => {
  const seen: string[] = [];

  return {
    get count() {
      return seen.length;
    },
    handler: http.get(JOURNEY, ({ request }) => {
      seen.push(request.url);
      return HttpResponse.json({
        success: true,
        data: { phase: "profile", profileOutcome: null },
      });
    }),
  };
};
