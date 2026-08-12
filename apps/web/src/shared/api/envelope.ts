// The backend's success-response envelope and the client-side unwrap.

import type { AxiosResponse } from "axios";

/**
 * Every 2xx response body from the API is wrapped as `{ success, data, meta? }`
 * (see the backend `sendSuccess`). This is the single client-side model of that
 * contract — repositories type their calls with it and `unwrap` to the payload.
 */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
  /** Optional metadata (e.g. cursor pagination); kept opaque until a consumer needs it. */
  meta?: Record<string, unknown>;
}

/**
 * Unwrap a success envelope to its inner payload. Unwrapping at the repository
 * boundary (rather than globally in an interceptor) keeps `meta` reachable on
 * the envelope for endpoints that return it.
 */
export const unwrap = <T>(res: AxiosResponse<ApiEnvelope<T>>): T => res.data.data;
