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

// ─── Ingest transport errors ─────────────────────────────────────────────────

export type MediaIngestErrorCode = "source_failed";

export class MediaIngestError extends Error {
  public readonly code: MediaIngestErrorCode;

  constructor(code: MediaIngestErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MediaIngestError";
    // Preserve the prototype chain for `instanceof` across the transpile target.
    Object.setPrototypeOf(this, MediaIngestError.prototype);
  }

  /** The upload stream failed before completing (e.g. a client-aborted or truncated request). */
  static sourceFailed(): MediaIngestError {
    return new MediaIngestError("source_failed", "Upload stream ended before completing");
  }
}

// ─── Read errors (ADR 0005 — Decisions 3 & 4) ────────────────────────────────

export type MediaReadErrorCode = "not_found" | "gone";

export class MediaReadError extends Error {
  public readonly code: MediaReadErrorCode;

  constructor(code: MediaReadErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MediaReadError";
    // Preserve the prototype chain for `instanceof` across the transpile target.
    Object.setPrototypeOf(this, MediaReadError.prototype);
  }

  /** No servable object for the token — unknown, not-yet-ready, or bytes unavailable. */
  static notFound(): MediaReadError {
    return new MediaReadError("not_found", "Media not available");
  }

  /** The object was deleted — a permanent failure (the token is never reissued). */
  static gone(): MediaReadError {
    return new MediaReadError("gone", "Media has been deleted");
  }
}

// ─── Attach errors (ADR 0005 Decision 5 — ownership authority) ───────────────

export type MediaAttachErrorCode = "not_attachable";

export class MediaAttachError extends Error {
  public readonly code: MediaAttachErrorCode;

  constructor(code: MediaAttachErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MediaAttachError";
    // Preserve the prototype chain for `instanceof` across the transpile target.
    Object.setPrototypeOf(this, MediaAttachError.prototype);
  }

  /**
   * The principal may not attach this object — unknown reference, owned by someone
   * else, or not servable. One opaque code by design: the caller never learns
   * which (no enumeration oracle).
   */
  static notAttachable(): MediaAttachError {
    return new MediaAttachError("not_attachable", "This media cannot be attached");
  }
}
