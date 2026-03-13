import axios, { type AxiosInstance } from "axios";
import { responseInterceptor } from "./interceptors/response";

export const apiClient: AxiosInstance = axios.create({
  baseURL: "https://tarmeezacademy.com/api/v1",
  headers: {
    Accept: "application/json",
  },
  timeout: 10000,
});
responseInterceptor(apiClient);
