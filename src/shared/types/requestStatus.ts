export type RequestStatus = "idle" | "loading" | "success" | "error";

export type RequestState<TError = Error> = {
  status: RequestStatus;
  error: TError | null;
};
