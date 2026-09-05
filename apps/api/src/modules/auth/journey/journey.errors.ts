/**
 * Onboarding Journey — the capability's own error, transport-agnostic.
 *
 * The service refuses in its own vocabulary and the controller translates at
 * the boundary, so the rules stay testable without HTTP in the room — the shape
 * password reset and channel verification both already use.
 */

export type JourneyErrorCode = "no_journey" | "illegal_transition";

export class JourneyError extends Error {
  public readonly code: JourneyErrorCode;

  constructor(code: JourneyErrorCode, message: string) {
    super(message);
    this.name = "JourneyError";
    this.code = code;
  }

  /** No journey exists for this account, so there is nothing to move. */
  static noJourney(): JourneyError {
    return new JourneyError("no_journey", "This account has no onboarding journey.");
  }

  /** The move would skip a step the journey requires. */
  static illegalTransition(): JourneyError {
    return new JourneyError("illegal_transition", "That step is not available.");
  }
}
