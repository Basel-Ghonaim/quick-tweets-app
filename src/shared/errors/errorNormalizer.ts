import axios from "axios";
import type { AppError } from "./AppError";
import { createError } from "./errorFactory";

export const errorNormalizer = (error: unknown): AppError => {
  if (axios.isAxiosError(error)) {
    const { response, code } = error;

    switch (code) {
      case "ERR_CANCELED":
        return createError("canceled", "Request was canceled");
      case "ERR_NETWORK":
        return createError("network", "Network error occurred");
      case "ECONNABORTED":
        return createError("timeout", "Request timeout");
      default:
        if (response) {
          const { status } = response;
          if (status === 401)
            return createError("unauthorized", "Unauthorized access", status);

          if (status >= 500)
            return createError("server", "Server error occurred", status);
        }
    }
  }
  if (error instanceof Error)
    return createError("unknown", error.message, undefined, error);
  return createError("unknown", "An unknown error occurred");
};
