/**
 * Onboarding Journey — the capability's types.
 *
 * The journey decides which onboarding screens a reader may reach and nothing
 * else. No account capability is gated on it (ADR 0008 Decision 2, as revised).
 */

import type { DbClient } from "../../../shared/database/index.js";

/**
 * Where a reader belongs. `none` is both "no journey" and "journey closed" —
 * the difference tells a caller nothing it can use, and collapsing it keeps the
 * answer uniform, the posture the confirmation failure already takes.
 */
export type JourneyPhase = "profile" | "verify" | "code" | "none";

/** What a caller may ask to move to. There is no target for `profile`: the
 *  journey starts there and never returns. */
export type JourneyTarget = "verify" | "code" | "completed";

/** How the profile step was left. Nothing on the server can tell the two apart,
 *  so the reader's own choice is the only witness. */
export type ProfileOutcome = "saved" | "skipped";

/** How the verification step ended. Read from the capability that owns the fact
 *  at the moment of closing, never asserted by a caller. */
export type VerificationOutcome = "verified" | "later";

/**
 * A requested move, carrying whatever that move needs.
 *
 * Discriminated so leaving the profile step without saying how cannot be
 * expressed, and so no other move can carry an outcome it has no business
 * asserting.
 */
export type JourneyMove =
  | { to: "verify"; outcome: ProfileOutcome }
  | { to: "code" }
  | { to: "completed" };

/** What both endpoints answer, so a caller re-syncs from either. */
export interface JourneyState {
  phase: JourneyPhase;
  profileOutcome: ProfileOutcome | null;
}

/** The set-once marks phase is derived from. Nothing else participates. */
export interface JourneyMarks {
  profileSettledAt: Date | null;
  codeReachedAt: Date | null;
  closedAt: Date | null;
}

/** A journey as stored. */
export interface JourneyRecord extends JourneyMarks {
  id: number;
  userId: number;
  profileOutcome: ProfileOutcome | null;
}

/**
 * The two things the journey needs to know about a channel it does not own.
 *
 * Named as the journey's own questions rather than as another module's type:
 * the capability depends on this shape, never on whoever satisfies it, so it
 * holds no import of the subsystem that owns the fact. The composition root
 * supplies both (`app.ts`), which is the same place the address is resolved.
 *
 * Two booleans rather than that module's tri-state, because a shared vocabulary
 * is the coupling this seam exists to prevent.
 */
export interface VerificationProbe {
  /** Is a challenge outstanding right now? Gates reaching the code step. */
  hasLiveChallenge(userId: number): Promise<boolean>;
  /** Has the channel been proven? Read once, when the journey closes. */
  hasProvenChannel(userId: number): Promise<boolean>;
}

/**
 * Creating this account's one journey, as registration needs it and nothing
 * more. Auth depends on this rather than on the service, which would drag in
 * the verification probe that only one transition uses and registration never
 * touches.
 */
export type BeginJourney = (userId: number, client?: DbClient) => Promise<void>;

export interface IJourneyRepository {
  /** Create this account's one journey. Enlistable in a caller's transaction,
   *  because it must commit with the account or not at all. */
  create(userId: number, client?: DbClient): Promise<void>;

  findByUserId(userId: number, client?: DbClient): Promise<JourneyRecord | null>;

  /**
   * Settle the profile step, but only while it is unsettled. The mark and how
   * the step was left are one write, so a settled step can never lack an
   * outcome.
   */
  settleProfile(
    id: number,
    at: Date,
    outcome: ProfileOutcome,
    client?: DbClient,
  ): Promise<boolean>;

  /** Reach the code step, only while it has not been reached. */
  reachCode(id: number, at: Date, client?: DbClient): Promise<boolean>;

  /**
   * Close the journey, only while it is still open. The step left and what
   * happened there are written with the mark, so a closed journey can never
   * lack either.
   */
  close(
    id: number,
    at: Date,
    reason: string,
    outcome: VerificationOutcome,
    client?: DbClient,
  ): Promise<boolean>;
}

export interface IJourneyService {
  /** Where this account's reader belongs. Writes nothing. */
  stateFor(userId: number): Promise<JourneyState>;

  /** Move the journey, or refuse. Answers with the resulting state either way,
   *  so a caller re-syncs from every response. */
  advance(userId: number, move: JourneyMove): Promise<JourneyState>;
}
