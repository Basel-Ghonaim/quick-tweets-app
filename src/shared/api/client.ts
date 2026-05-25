import axios, { type AxiosInstance } from "axios";
import { responseInterceptor } from "./interceptors/response";
import { API_BASE_URL, API_TIMEOUT } from "./config";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  timeout: API_TIMEOUT,
});

// No callbacks → simple error normalization only (no token refresh)
responseInterceptor(apiClient);
