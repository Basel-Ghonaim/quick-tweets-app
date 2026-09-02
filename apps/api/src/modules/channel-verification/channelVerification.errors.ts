/**
 * Channel Verification — error types.
 *
 * Transport-agnostic in the style of Media's module errors: this module never
 * speaks HTTP, and the boundary above it decides the status mapping.
 */

export type ChannelVerificationErrorCode =
  | "invalid_code"
  | "invalid_format"
  | "cooldown_active"
  | "confirmation_failed";

export class ChannelVerificationError extends Error {
  public readonly code: ChannelVerificationErrorCode;

  /**
   * Whole seconds until the refused action may be retried, where the module
   * knows. Carried transport-agnostically — the boundary decides that HTTP
   * spells it `Retry-After`.
   */
  public readonly retryAfterSeconds?: number;

  constructor(
    code: ChannelVerificationErrorCode,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = "ChannelVerificationError";
    // Preserve the prototype chain for `instanceof` across the transpile target.
    Object.setPrototypeOf(this, ChannelVerificationError.prototype);
  }

  /**
   * The submitted value is not a well-formed code. Carries no echo of the value:
   * a rejected secret must not reach a log through an error message.
   */
  static invalidCode(): ChannelVerificationError {
    return new ChannelVerificationError("invalid_code", "Malformed challenge code");
  }

  /**
   * The configured code format could not produce a meaningful code. Distinct
   * from `invalid_code` so a misconfiguration is never diagnosed as a holder
   * mistyping their code.
   */
  static invalidFormat(): ChannelVerificationError {
    return new ChannelVerificationError(
      "invalid_format",
      "Challenge code format needs at least two distinct characters and a positive length",
    );
  }

  /**
   * Another challenge was issued for this subject too recently.
   *
   * Carries how long is left, because the caller is asking about their own
   * address and their own throttle: nothing here is another account's to leak,
   * and withholding it only forces the caller to guess the setting.
   */
  static cooldownActive(retryAfterSeconds?: number): ChannelVerificationError {
    return new ChannelVerificationError(
      "cooldown_active",
      "A challenge was issued for this endpoint too recently",
      retryAfterSeconds,
    );
  }

  /**
   * The single outcome of every failed confirmation — malformed, unknown
   * subject, none open, expired, closed, superseded, or simply wrong.
   *
   * One shape because uniform opacity is auditable and a carve-out is not: the
   * moment any one cause reports itself, it acquires its own message, then its
   * own status, and the guarantee decays by increments. The cause is kept for
   * diagnostics; it never reaches the caller.
   */
  static confirmationFailed(): ChannelVerificationError {
    return new ChannelVerificationError(
      "confirmation_failed",
      "Confirmation failed",
    );
  }
}
