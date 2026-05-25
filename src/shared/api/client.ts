import axios, { type AxiosInstance } from "axios";
import { retryInterceptor } from "./interceptors/retry";
import { responseInterceptor } from "./interceptors/response";
import { API_BASE_URL, API_TIMEOUT } from "./config";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  timeout: API_TIMEOUT,
});

// Order matters: retry first (transient failures), then normalize errors
retryInterceptor(apiClient);
// No callbacks → simple error normalization only (no token refresh)
responseInterceptor(apiClient);
