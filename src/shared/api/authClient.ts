import axios from "axios";
import { attachTokenInterceptor, responseInterceptor } from "./interceptors";

export const authClient = axios.create({
  baseURL: "https://tarmeezacademy.com/api/v1",
  headers: {
    Accept: "application/json",
  },
  timeout: 10000,
});

attachTokenInterceptor(authClient);
responseInterceptor(authClient);
