// Anonymous Axios client that still sends the browser's credentials — retry and
// error normalization, no bearer token and no 401 refresh.

import axios, { type AxiosInstance } from "axios";
import { retryInterceptor } from "./interceptors/retry";
import { responseInterceptor } from "./interceptors/response";
import { API_BASE_URL, API_TIMEOUT } from "./config";

/**
 * For endpoints the server addresses by a cookie it set, with no session behind
 * it. Attaching a token would send one where none is read, and arming the
 * refresh replay would drive a session flow on behalf of a signed-out reader.
 */
export const publicCredentialedClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: API_TIMEOUT,
});

retryInterceptor(publicCredentialedClient);
responseInterceptor(publicCredentialedClient);
