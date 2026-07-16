/**
 * Media module — storage-layer error type.
 *
 * A small, HTTP-agnostic error in the style of the backend's `AppError`, but
 * carrying no HTTP status: the Media module is transport-agnostic (ADR 0005).
 * A higher layer (the read boundary, M5) decides the HTTP mapping; storage
 * code never does.
 */

export type MediaStorageErrorCode = "not_found" | "invalid_key";

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
}
