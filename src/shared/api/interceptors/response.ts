import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { errorNormalizer } from "../../errors";

/**
 * Callbacks for token lifecycle events.
 * Provided by the app layer — the interceptor doesn't know about Redux or any store.
 */
export interface TokenRefreshCallbacks {
  /** Attempt to refresh the access token. Returns the new token. */
  refreshToken: () => Promise<string>;
  /** Called after a successful refresh — save the new token. */
  onTokenRefreshed: (newAccessToken: string) => void;
  /** Called when refresh fails — session is over. */
  onSessionExpired: () => void;
}

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

/**
 * Response interceptor — normalizes errors and optionally handles 401 with token refresh.
 *
 * Without callbacks: just normalizes errors (for public clients like apiClient).
 * With callbacks: on 401 → refresh token → retry failed request.
 *
 * Concurrent request handling:
 * If multiple requests fail with 401 simultaneously, only ONE /refresh
 * call is made. All others wait for it, then retry together.
 */
export const responseInterceptor = (
  client: AxiosInstance,
  callbacks?: TokenRefreshCallbacks,
) => {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const normalizedError = errorNormalizer(error);

      if (typeof import.meta !== "undefined" && import.meta.env?.PROD) {
        delete normalizedError.stack;
      }

      // No callbacks → simple error normalization (public client)
      if (!callbacks || error.response?.status !== 401) {
        return Promise.reject(normalizedError);
      }

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Already retried → don't loop
      if (originalRequest._retry) {
        return Promise.reject(normalizedError);
      }

      // This IS the refresh request failing → session is over
      if (originalRequest.url?.includes("/auth/refresh")) {
        callbacks.onSessionExpired();
        return Promise.reject(normalizedError);
      }

      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request
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
