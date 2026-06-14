import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { createAppError, createUnknownError } from "../errors/errorFactory";
import { AppError } from "../errors/AppError";
import type { ErrorType } from "../errors/types";

// The raw RTK query base with dynamic token injection
const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api/v1",
  prepareHeaders: (headers, { getState }) => {
    // Strictly prevent circular dependencies by casting the state inline
    const token = (getState() as { auth: { token: string | null } }).auth?.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * A custom BaseQuery that wraps fetchBaseQuery.
 * It intercepts RTK Query's FetchBaseQueryError and normalizes it into our standard AppError
 * so that UI components remain completely agnostic of the underlying data-fetching technology.
 */
export const unifiedBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  AppError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    const fetchError = result.error as FetchBaseQueryError;

    // Handle Network, Parsing, and Timeout errors generated internally by fetchBaseQuery
    if (
      fetchError.status === "FETCH_ERROR" ||
      fetchError.status === "TIMEOUT_ERROR" ||
      fetchError.status === "CUSTOM_ERROR"
    ) {
      return {
        error: createAppError("network", fetchError.error || "Network Error"),
      };
    }
    
    if (fetchError.status === "PARSING_ERROR") {
      return { error: createUnknownError(new Error(fetchError.error)) };
    }

    // Handle standard backend JSON HTTP errors
    const backendData = fetchError.data as
      | { success: false; error: { type: ErrorType; message: string; errors?: any } }
      | undefined;

    if (backendData && backendData.error) {
      return {
        error: createAppError(
          backendData.error.type,
          backendData.error.message,
          backendData.error.errors
        ),
      };
    }

    // Fallback for completely unrecognized formats
    return { error: createUnknownError(fetchError) };
  }

  return result;
};
