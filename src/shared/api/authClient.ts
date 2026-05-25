/**
 * Authenticated Axios client — HTTP client with token attachment and refresh.
 *
 * Purpose:
 * - Axios instance pre-configured for authenticated API calls
 * - Token attachment and refresh callbacks are wired via setupAuthClient()
 * - This file has ZERO knowledge of Redux, auth module, or app layer
 *
 * Setup:
 * - Call setupAuthClient() from app bootstrap (main.tsx) before any API calls
 * - The interceptors are attached lazily — not on import
 */

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

/**
 * Wires token attachment + refresh interceptors into the authClient.
 * Must be called once from the app bootstrap layer before any API calls.
 *
 * @param getAccessToken - Callback to read the current token (e.g., from Redux)
 * @param refreshCallbacks - Token refresh lifecycle callbacks
 */
export const setupAuthClient = (
  getAccessToken: () => string | null,
  refreshCallbacks: TokenRefreshCallbacks,
) => {
  attachTokenInterceptor(authClient, getAccessToken);
  // Order matters: retry first (transient failures), then refresh + normalize
  retryInterceptor(authClient);
  responseInterceptor(authClient, refreshCallbacks);
};
