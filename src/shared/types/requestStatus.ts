export type RequestStatus = "idle" | "loading" | "success" | "error";

export type RequestState = {
  status: RequestStatus;
  error: Error | null;
};
