/**
 * Retry interceptor — retries transient failures with exponential backoff.
 *
 * Purpose:
 * - Retries requests that fail due to network errors, timeouts, or 5xx server errors
 * - Uses exponential backoff to avoid overwhelming the server
 * - Configurable max retries and retryable status codes
 * - Does NOT retry client errors (4xx) — those are intentional rejections
 *
 * Default behavior:
 * - Max 2 retries (3 total attempts)
 * - Retries on: 500, 502, 503, 504, ECONNABORTED, ERR_NETWORK
 * - Backoff: 1s → 2s (doubles each attempt)
 */

import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

export interface RetryOptions {
  /** Maximum number of retry attempts. Default: 2 */
  maxRetries?: number;
  /** HTTP status codes to retry. Default: [500, 502, 503, 504] */
  retryableStatuses?: number[];
  /** Base delay in ms before first retry. Default: 1000 */
  baseDelay?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  retryableStatuses: [500, 502, 503, 504],
  baseDelay: 1000,
};

/** Axios error codes that indicate transient network issues. */
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
