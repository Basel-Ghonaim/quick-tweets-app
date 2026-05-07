import axios, { type AxiosInstance } from "axios";
import { responseInterceptor } from "./interceptors/response";

export const apiClient: AxiosInstance = axios.create({
  baseURL: "http://localhost:4000/api/v1",
  headers: {
    Accept: "application/json",
  },
  timeout: 10000,
});

// No callbacks → simple error normalization only (no token refresh)
responseInterceptor(apiClient);
