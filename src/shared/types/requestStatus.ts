import type { SerializedAppError } from "@shared/errors";

export type RequestStatus = "idle" | "loading" | "success" | "error";

// Redux state must be serializable, so a request's error defaults to the plain
// SerializedAppError DTO — never the AppError class instance.
export type RequestState<TError = SerializedAppError> = {
  status: RequestStatus;
  error: TError | null;
};
