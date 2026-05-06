import axios from "axios";
import { attachTokenInterceptor, responseInterceptor } from "./interceptors";

export const authClient = axios.create({
  baseURL: "http://localhost:4000/api/v1",
  headers: {
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

attachTokenInterceptor(authClient);
responseInterceptor(authClient);
