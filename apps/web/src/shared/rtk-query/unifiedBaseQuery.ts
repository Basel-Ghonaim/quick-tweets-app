import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
} from "@reduxjs/toolkit/query/react";
import { AppError } from "../errors/AppError";
import { errorNormalizer } from "../errors/errorNormalizer";

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
    return { error: errorNormalizer(result.error) };
  }

  return result;
};
