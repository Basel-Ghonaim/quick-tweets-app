// Typed error class — carries type, status, and optional structured errors payload.

import { errorConfigMap } from "./errorConfig";
import { type ErrorType, type ErrorPayload, type SerializedAppError } from "./types";

export class AppError<T extends ErrorType = ErrorType> extends Error {
  public readonly type: T;
  public readonly status: number;
  public readonly errors?: ErrorPayload<T>;
  /** Whole seconds a refusal named as its own retry window. Present only where
   *  the response carried one; HTTP spells it `Retry-After`. */
  public readonly retryAfterSeconds?: number;

  constructor(
    type: T,
    message: string,
    errors?: ErrorPayload<T>,
    retryAfterSeconds?: number,
  ) {
    super(message);

    this.name = this.constructor.name;

    this.type = type;
    this.status = errorConfigMap[type].status;
    this.errors = errors;
    this.retryAfterSeconds = retryAfterSeconds;

    if ("captureStackTrace" in Error) {
      (
        Error as {
          captureStackTrace?: (
            target: object,
            constructorOpt?: (...args: never[]) => unknown,
          ) => void;
        }
      ).captureStackTrace?.(
        this,
        this.constructor as (...args: never[]) => unknown,
      );
    }
  }

  /**
   * Plain, serializable projection for Redux/state boundaries — drops the `Error`
   * machinery (prototype, stack) so it never trips the store's serializability check.
   */
  toSerialized(): SerializedAppError<T> {
    return {
      type: this.type,
      message: this.message,
      status: this.status,
      errors: this.errors,
      retryAfterSeconds: this.retryAfterSeconds,
    };
  }
}
