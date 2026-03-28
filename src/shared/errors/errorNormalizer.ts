import axios from "axios";
import type { AppError } from "./AppError";
import { createAppError, createUnknownError } from "./errorFactory";

export const errorNormalizer = (error: unknown): AppError => {
  if (axios.isAxiosError(error)) {
    const { response, code } = error;

    switch (code) {
      case "ERR_CANCELED":
        return createAppError("canceled", "Request was canceled");
      case "ERR_NETWORK":
        return createAppError("network", "Network error occurred");
      case "ECONNABORTED":
        return createAppError("timeout", "Request timeout");
      default:
        if (response) {
          const { status } = response;
          if (status === 401)
            return createAppError(
              "unauthorized",
              "Unauthorized access",
              status,
            );

          if (status >= 500)
            return createAppError("server", "Server error occurred", status);
        }
    }
  }

  return createUnknownError(error);
};
