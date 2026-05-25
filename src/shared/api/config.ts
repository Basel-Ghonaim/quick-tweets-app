/**
 * API configuration — centralized HTTP client settings.
 *
 * Purpose:
 * - Single source of truth for baseURL and shared Axios defaults
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

export const API_TIMEOUT = 10_000;
