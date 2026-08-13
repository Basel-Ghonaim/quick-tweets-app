// Response interceptor — error normalization + optional 401 token refresh.

import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { errorNormalizer } from "../../errors";

export interface TokenRefreshCallbacks {
  refreshToken: () => Promise<string>;
  onTokenRefreshed: (newAccessToken: string) => void;
  onSessionExpired: () => void;
}

export const responseInterceptor = (
  client: AxiosInstance,
  callbacks?: TokenRefreshCallbacks,
  getAccessToken?: () => string | null,
) => {
  // Refresh state scoped per client instance
  let isRefreshing = false;
  let pendingRequests: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  const processPendingRequests = (token: string | null, error: unknown = null) => {
    pendingRequests.forEach(({ resolve, reject }) => {
      if (token) resolve(token);
      else reject(error);
    });
    pendingRequests = [];
  };

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const normalizedError = errorNormalizer(error);

      if (typeof import.meta !== "undefined" && import.meta.env?.PROD) {
        delete normalizedError.stack;
      }

      if (!callbacks || error.response?.status !== 401) {
        return Promise.reject(normalizedError);
      }

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (originalRequest._retry) {
        return Promise.reject(normalizedError);
      }

      if (originalRequest.url?.includes("/auth/refresh")) {
        callbacks.onSessionExpired();
        return Promise.reject(normalizedError);
      }

      // A 401 with no access token means "not signed in" (e.g. a failed login),
      // not an expired session — there is nothing to refresh.
      if (getAccessToken && !getAccessToken()) {
        return Promise.reject(normalizedError);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const newToken = await callbacks.refreshToken();
        callbacks.onTokenRefreshed(newToken);
        processPendingRequests(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processPendingRequests(null, refreshError);
        callbacks.onSessionExpired();
        return Promise.reject(errorNormalizer(refreshError));
      } finally {
        isRefreshing = false;
      }
    },
  );
};
