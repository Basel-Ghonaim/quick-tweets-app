/**
 * Channel Verification — error types.
 *
 * Transport-agnostic in the style of Media's module errors: this module never
 * speaks HTTP, and the boundary above it decides the status mapping.
 */

export type ChannelVerificationErrorCode = "invalid_code" | "invalid_format";

export class ChannelVerificationError extends Error {
  public readonly code: ChannelVerificationErrorCode;

  constructor(code: ChannelVerificationErrorCode, message: string) {
    super(message);
    this.code = code;
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
}
