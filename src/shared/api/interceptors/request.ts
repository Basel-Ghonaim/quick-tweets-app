import type { AxiosInstance } from "axios";

/**
 * Attaches the access token to outgoing requests via the Authorization header.
 * Accepts a callback to retrieve the token — the interceptor doesn't know
 * where the token is stored (Redux, localStorage, etc.).
 */
export const attachTokenInterceptor = (
  client: AxiosInstance,
  getAccessToken: () => string | null,
) => {
  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};