import axios from "axios";
import type { AppError } from "./AppError";

export const errorNormalizer = (error: unknown): AppError => {
  if (axios.isAxiosError(error)) {
    const { response, code } = error;

    switch (code) {
      case "ERR_CANCELED":
        return { type: "canceled", message: "Request canceled" };
      case "ERR_NETWORK":
        return { type: "network", message: "Network error occurred" };
      case "ECONNABORTED":
        return { type: "timeout", message: "Request timeout" };
      default:
        if (response) {
          const { status } = response;
          if (status === 401)
            return {
              type: "unauthorized",
              message: "Unauthorized access",
              status,
            };

          if (status >= 500)
            return { type: "server", message: "Server error occurred", status };
        }
    }
  }
  if (error instanceof Error)
    return { type: "unknown", message: error.message };
  return { type: "unknown", message: "An unknown error occurred" };
};
