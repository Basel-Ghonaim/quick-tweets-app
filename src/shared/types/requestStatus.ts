import type { AppError } from "@shared/errors";

export type RequestStatus = "idle" | "loading" | "success" | "error";

export type RequestState<TError = AppError> = {
  status: RequestStatus;
  error: TError | null;
};
