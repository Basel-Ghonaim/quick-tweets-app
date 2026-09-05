/**
 * Onboarding Journey — the derivation, and the only place a transition is judged.
 *
 * Both functions here are pure. Phase is read off the marks in a fixed order,
 * so a journey answers correctly with nobody having written to it, and a
 * transition is decided without a database in the room — which is what lets the
 * whole rule set be proved in the unit lane rather than through HTTP.
 */

import type { JourneyMarks, JourneyPhase, JourneyTarget } from "./journey.types.js";

/**
 * Fixed order, and the order is the rule.
 *
 * `closedAt` is consulted first because a closed journey is over whatever else
 * is marked on it. Verification's own status is deliberately absent: deriving
 * `none` from a proven address would make the closing write unreachable on the
 * one path that always reaches it, and would return a settled reader to
 * onboarding the day the address becomes mutable.
 */
export const phaseOf = (marks: JourneyMarks | null): JourneyPhase => {
  if (marks === null) return "none";
  if (marks.closedAt !== null) return "none";
  if (marks.codeReachedAt !== null) return "code";
  if (marks.profileSettledAt !== null) return "verify";
  return "profile";
};

/** What a legal `advance` does. `noop` is a request that asks for no movement. */
export type Transition =
  | { kind: "refused" }
  | { kind: "noop" }
  | { kind: "settleProfile" }
  | { kind: "reachCode" }
  | { kind: "close"; reason: "declined" };

const REFUSED = { kind: "refused" } as const;
const NOOP = { kind: "noop" } as const;

/** Position in the journey, so a request to go backwards is recognisable. */
const RANK: Record<JourneyPhase | JourneyTarget, number> = {
  none: 0,
  profile: 1,
  verify: 2,
  code: 3,
  completed: 4,
};

/**
 * A journey moves forward or not at all.
 *
 * A request to go backwards is a no-op rather than an error: the reader is
 * already past it, and answering with the true phase re-syncs a client that
 * asked from stale state. Refusal is reserved for a move that would skip a step
 * the journey requires — which is the enforcement the client cannot be trusted
 * with, since the client is exactly what a typed URL bypasses.
 */
export const decideTransition = (phase: JourneyPhase, to: JourneyTarget): Transition => {
  // A closed journey accepts only the request that closes it, which makes a
  // retried close idempotent instead of an error.
  if (phase === "none") return to === "completed" ? NOOP : REFUSED;

  if (RANK[to] <= RANK[phase]) return NOOP;

  if (phase === "profile") {
    // Profile's only exit is Verify, whether it was completed or skipped.
    return to === "verify" ? { kind: "settleProfile" } : REFUSED;
  }

  if (phase === "verify") {
    return to === "code" ? { kind: "reachCode" } : { kind: "close", reason: "declined" };
  }

  // `code` is terminal, so the only move left is out.
  return { kind: "close", reason: "declined" };
};
