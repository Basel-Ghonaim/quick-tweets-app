// Typed error class — carries type, status, and optional structured errors payload.

import { httpStatusMap, type ErrorType, type ErrorPayload } from "./types";

export class AppError<T extends ErrorType = ErrorType> extends Error {
  public readonly type: T;
  public readonly status: number;
  public readonly errors?: ErrorPayload<T>;

  constructor(type: T, message: string, errors?: ErrorPayload<T>) {
    super(message);

    this.name = this.constructor.name;

    this.type = type;
    this.status = httpStatusMap[type];
    this.errors = errors;

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
}
