import { useMemo } from "react";
import type { RequestState } from "../types";

export interface RequestStateAPI {
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: RequestState["error"];
}

export const useRequestState = (state: RequestState): RequestStateAPI => {
  return useMemo(
    () => ({
      isIdle: state.status === "idle",
      isLoading: state.status === "loading",
      isSuccess: state.status === "success",
      isError: state.status === "error",
      error: state.error,
    }),
    [state.status, state.error],
  );
};
