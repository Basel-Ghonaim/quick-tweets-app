// Authenticated Axios client — wired via setupAuthClient() from app bootstrap.

import axios from "axios";
import { attachTokenInterceptor } from "./interceptors/request";
import { retryInterceptor } from "./interceptors/retry";
import { responseInterceptor, type TokenRefreshCallbacks } from "./interceptors/response";
import { API_BASE_URL, API_TIMEOUT } from "./config";

export const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: API_TIMEOUT,
});

// Wires interceptors into authClient. Called once from app/bootstrap.ts.
export const setupAuthClient = (
  getAccessToken: () => string | null,
  refreshCallbacks: TokenRefreshCallbacks,
) => {
  attachTokenInterceptor(authClient, getAccessToken);
  retryInterceptor(authClient);
  responseInterceptor(authClient, refreshCallbacks, getAccessToken);
};
