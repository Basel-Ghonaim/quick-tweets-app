/**
 * Password Reset — error types.
 *
 * Transport-agnostic in the style of Channel Verification's own module
 * errors: this module never speaks HTTP, and the boundary above it decides
 * the status mapping.
 */

export type PasswordResetErrorCode = "invalid_format" | "invalid_code" | "not_usable";

export class PasswordResetError extends Error {
  public readonly code: PasswordResetErrorCode;

  constructor(code: PasswordResetErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "PasswordResetError";
    // Preserve the prototype chain for `instanceof` across the transpile target.
    Object.setPrototypeOf(this, PasswordResetError.prototype);
  }

  /**
   * The configured code format could not produce a meaningful code. Distinct
   * from `invalid_code` so a misconfiguration is never diagnosed as a holder
   * mistyping their code.
   */
  static invalidFormat(): PasswordResetError {
    return new PasswordResetError(
      "invalid_format",
      "Reset code format needs at least two distinct characters and a positive length",
    );
  }

  /**
   * The submitted value is not well-formed enough to even look up — too
   * short, or characters outside the alphabet. Carries no echo of the value:
   * a rejected secret must not reach a log through an error message.
   */
  static invalidCode(): PasswordResetError {
    return new PasswordResetError("invalid_code", "Malformed reset code");
  }

  /**
   * The single outcome of every code that is not currently spendable —
   * never issued, expired, or already used. One shape, mirroring Channel
   * Verification's own `confirmationFailed`: uniform opacity is auditable,
   * and the moment one cause reports itself, the guarantee decays by
   * increments. The cause is available internally for diagnostics; it never
   * reaches the caller. `confirm` and `apply` both throw this identically —
   * `confirm` being read-only changes what the check costs, not what it may
   * disclose.
   */
  static notUsable(): PasswordResetError {
    return new PasswordResetError("not_usable", "That reset code is not valid");
  }
}
