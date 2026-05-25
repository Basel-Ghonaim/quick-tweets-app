import axios from "axios";
import { reduxStore } from "@app/store/store";
import { authActions } from "@modules/auth";
import { appStorage, STORAGE_KEYS } from "../storage";
import { attachTokenInterceptor } from "./interceptors/request";
import { responseInterceptor } from "./interceptors/response";
import { API_BASE_URL, API_TIMEOUT } from "./config";

export const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: API_TIMEOUT,
});

// Token attachment — reads from Redux store (token lives in memory only)
attachTokenInterceptor(
  authClient,
  () => reduxStore.getState().auth.accessToken,
);

// Response interceptor — handles 401 with automatic refresh
responseInterceptor(authClient, {
  refreshToken: async () => {
    const res = await authClient.post("/auth/refresh");
    return res.data.accessToken;
  },
  onTokenRefreshed: (newAccessToken) => {
    reduxStore.dispatch(
      authActions.authRequestFulfilled({
        requestType: "login",
        accessToken: newAccessToken,
      }),
    );
  },
  onSessionExpired: () => {
    appStorage.remove(STORAGE_KEYS.USER);
    reduxStore.dispatch(
      authActions.authRequestFulfilled({ requestType: "logout" }),
    );
  },
});
