import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
} from "@reduxjs/toolkit/query/react";
import { AppError } from "../errors/AppError";
import { errorNormalizer } from "../errors/errorNormalizer";
import { selectAccessToken, type WithSession } from "../session";

export const attachSessionBearer = (headers: Headers, getState: () => unknown): Headers => {
  const token = selectAccessToken(getState() as WithSession);
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api/v1",
  prepareHeaders: (headers, { getState }) => attachSessionBearer(headers, getState),
});

/** Every fetchBaseQuery failure becomes an AppError before a hook sees it, so
 *  components stay agnostic of the transport. */
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
