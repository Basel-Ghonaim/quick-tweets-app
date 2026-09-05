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
}

/**
 * Whether a live verification challenge exists for this account right now.
 *
 * Named as the journey's own need rather than as another module's type: the
 * capability depends on this shape, never on whoever satisfies it, so it holds
 * no import of the subsystem that owns the fact. The composition root supplies
 * it (`app.ts`), which is the same place the account's address is resolved.
 */
export type VerificationProbe = (userId: number) => Promise<boolean>;

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
   * Fill one mark, but only while it is still NULL. Reports whether this call
   * was the one that wrote it, so two racing callers produce one write and one
   * no-op rather than a lost update.
   */
  fillMark(
    id: number,
    mark: "profileSettledAt" | "codeReachedAt",
    at: Date,
    client?: DbClient,
  ): Promise<boolean>;

  /** Close the journey, only while it is still open. */
  close(id: number, at: Date, reason: string, client?: DbClient): Promise<boolean>;
}

export interface IJourneyService {
  /** The phase this account's reader belongs in. Writes nothing. */
  phaseFor(userId: number): Promise<JourneyPhase>;

  /** Move the journey, or refuse. Answers with the resulting phase either way,
   *  so a caller re-syncs from every response. */
  advance(userId: number, to: JourneyTarget): Promise<JourneyPhase>;
}
