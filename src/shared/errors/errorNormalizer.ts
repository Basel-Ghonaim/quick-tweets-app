// Entry point: converts any caught error into a typed AppError.

import axios from "axios";
import { AppError } from "./AppError";
import { createUnknownError } from "./errorFactory";
import { parseAxiosError } from "./parsers/axiosParser";
import {
  isFetchBaseQueryError,
  rtkQueryParser,
} from "./parsers/rtkQueryParser";

export const errorNormalizer = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const parsed = parseAxiosError(error);
    if (parsed) {
      return parsed;
    }
  }

  if (isFetchBaseQueryError(error)) {
    const parsed = rtkQueryParser(error);
    if (parsed) {
      return parsed;
    }
  }

  return createUnknownError(error);
};
