import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { AppError } from "../AppError";
import { createAppError, createUnknownError } from "../errorFactory";
import { errorConfigMap } from "../errorConfig";
import { buildAppError, type BackendErrorBody } from "./parserUtils";

export const rtkQueryParser = (error: FetchBaseQueryError): AppError | null => {
  // RTK Query string statuses — library-specific transport errors
  if (typeof error.status === "string") {
    switch (error.status) {
      case "FETCH_ERROR":
        return createAppError("network", errorConfigMap.network.defaultMessage);
      case "TIMEOUT_ERROR":
        return createAppError("timeout", errorConfigMap.timeout.defaultMessage);
      case "PARSING_ERROR":
        return createUnknownError(new Error(error.error));
      case "CUSTOM_ERROR":
        return createUnknownError(error.error);
    }

    return null;
  }

  // Numeric HTTP status — delegate to shared helper
  const body = error.data as BackendErrorBody | undefined;
  const backendType = body?.error?.type;
  const validationErrors = body?.error?.errors;

  return buildAppError(error.status, backendType, validationErrors);
};
