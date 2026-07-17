/**
 * Media module — error types.
 *
 * Small, HTTP-agnostic errors in the style of the backend's `AppError`, but
 * carrying no HTTP status: the Media module is transport-agnostic (ADR 0005).
 * A higher layer (the ingest and read boundaries) decides the HTTP mapping —
 * e.g. a validation rejection becomes the reserved 415/413 there; storage and
 * policy code never speak HTTP.
 */

export type MediaStorageErrorCode = "not_found" | "invalid_key" | "invalid_token";

export class MediaStorageError extends Error {
  public readonly code: MediaStorageErrorCode;

  constructor(code: MediaStorageErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MediaStorageError";
    // Preserve the prototype chain for `instanceof` across the transpile target.
    Object.setPrototypeOf(this, MediaStorageError.prototype);
  }

  /** No object is stored at the given key. */
  static notFound(key: string): MediaStorageError {
    return new MediaStorageError("not_found", `No stored object for key '${key}'`);
  }

  /** The key is malformed or would escape the storage root. */
  static invalidKey(value: string): MediaStorageError {
    return new MediaStorageError("invalid_key", `Invalid storage key '${value}'`);
  }

  /** The public token is malformed (not a well-formed media token). */
  static invalidToken(value: string): MediaStorageError {
    return new MediaStorageError("invalid_token", `Invalid media token '${value}'`);
  }
}

// ─── Validation errors (ADR 0005 — Decision 7) ───────────────────────────────

export type MediaValidationErrorCode = "unsupported_type" | "too_large";

export class MediaValidationError extends Error {
  public readonly code: MediaValidationErrorCode;

  constructor(code: MediaValidationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MediaValidationError";
    // Preserve the prototype chain for `instanceof` across the transpile target.
    Object.setPrototypeOf(this, MediaValidationError.prototype);
  }

  /** The content does not verify as any allowed type (the declared type is irrelevant). */
  static unsupportedType(): MediaValidationError {
    return new MediaValidationError(
      "unsupported_type",
      "Content does not verify as an allowed media type",
    );
  }

  /** The content exceeds the media size limit. */
  static tooLarge(sizeBytes: number, limitBytes: number): MediaValidationError {
    return new MediaValidationError(
      "too_large",
      `Content of ${sizeBytes} bytes exceeds the ${limitBytes}-byte media size limit`,
    );
  }
}
