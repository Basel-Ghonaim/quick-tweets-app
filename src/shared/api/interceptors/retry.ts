// Retry interceptor — exponential backoff for 5xx and network errors.

import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

export interface RetryOptions {
  maxRetries?: number;
  retryableStatuses?: number[];
  baseDelay?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  retryableStatuses: [500, 502, 503, 504],
  baseDelay: 1000,
};

const RETRYABLE_CODES = new Set(["ECONNABORTED", "ERR_NETWORK"]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retryInterceptor = (
  client: AxiosInstance,
  options?: RetryOptions,
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const retryCount = originalRequest._retryCount ?? 0;
    const status = error.response?.status;
    const code = error.code;

    const isRetryableStatus = status !== undefined && config.retryableStatuses.includes(status);
    const isRetryableCode = code !== undefined && RETRYABLE_CODES.has(code);
    const hasRetriesLeft = retryCount < config.maxRetries;

    if (hasRetriesLeft && (isRetryableStatus || isRetryableCode)) {
      originalRequest._retryCount = retryCount + 1;

      const backoffDelay = config.baseDelay * Math.pow(2, retryCount);
      await delay(backoffDelay);

      return client(originalRequest);
    }

    return Promise.reject(error);
  });
};
