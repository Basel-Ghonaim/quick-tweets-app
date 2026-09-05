/** Where the reader belongs. `none` is both no journey and a closed one. */
export type JourneyPhase = "profile" | "verify" | "code" | "none";

/** How the profile step was left. The reader's choice is the only witness. */
export type ProfileOutcome = "saved" | "skipped";

/** What both endpoints answer, so a caller re-syncs from either. */
export interface JourneyState {
  phase: JourneyPhase;
  profileOutcome: ProfileOutcome | null;
}

/** A move, discriminated so only the profile step can carry an outcome. */
export type JourneyMove =
  | { to: "verify"; outcome: ProfileOutcome }
  | { to: "code" }
  | { to: "completed" };

export interface JourneyRepository {
  read(): Promise<JourneyState>;
  advance(move: JourneyMove): Promise<JourneyState>;
}
