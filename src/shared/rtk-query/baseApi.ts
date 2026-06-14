import { createApi } from "@reduxjs/toolkit/query/react";
import { unifiedBaseQuery } from "./unifiedBaseQuery";

/**
 * The central RTK Query API slice for the application.
 * All feature endpoints should be injected into this single instance using `baseApi.injectEndpoints`.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: unifiedBaseQuery,
  // Tag types will be defined incrementally as we inject real endpoints
  endpoints: () => ({}),
});
