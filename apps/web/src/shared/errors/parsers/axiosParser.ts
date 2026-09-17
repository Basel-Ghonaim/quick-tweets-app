import type { AxiosError } from "axios";
import type { AppError } from "../AppError";
import { createAppError } from "../errorFactory";
import { defaultMessageFor } from "../errorMessages";
import { buildAppError, retryAfterSeconds, type BackendErrorBody } from "./parserUtils";

export const parseAxiosError = (
  error: AxiosError<BackendErrorBody>,
): AppError | null => {
  const { response, code } = error;

  // HTTP response received — delegate to shared helper
  if (response) {
    const backendType = response.data?.error?.type;
    const validationErrors = response.data?.error?.errors;

    return buildAppError(
      response.status,
      backendType,
      validationErrors,
      retryAfterSeconds(response.headers?.["retry-after"]),
    );
  }

  // No response — handle Axios-specific network/transport codes
  switch (code) {
    case "ERR_CANCELED":
      return createAppError("canceled", defaultMessageFor("canceled"));
    case "ERR_NETWORK":
      return createAppError("network", defaultMessageFor("network"));
    case "ECONNABORTED":
      return createAppError("timeout", defaultMessageFor("timeout"));
  }

  return null;
};
