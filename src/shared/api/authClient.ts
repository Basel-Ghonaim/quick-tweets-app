import axios from "axios";
import { attachTokenInterceptor } from "./interceptors/request";
import { responseInterceptor } from "./interceptors/response";
import { reduxStore } from "../../app/store/store";
import { authActions } from "../../modules/auth/store";
import { appStorage, STORAGE_KEYS } from "../storage";

export const authClient = axios.create({
  baseURL: "http://localhost:4000/api/v1",
  headers: {
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: 10000,
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
