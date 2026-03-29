import axios from "axios";
import { AppError } from "./AppError";
import { createUnknownError } from "./errorFactory";
import { parseAxiosError, type BackendErrorResponse } from "./parsers/axiosParser";

export const errorNormalizer = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  if (axios.isAxiosError<BackendErrorResponse>(error)) {
    const parsedError = parseAxiosError(error);
    if (parsedError) {
      return parsedError;
    }
  }

  return createUnknownError(error);
};
