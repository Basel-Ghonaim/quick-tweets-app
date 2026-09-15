/**
 * Where a handler matches, for both lanes.
 *
 * The leading wildcard makes a handler origin-agnostic: the transport's base
 * URL is environment-driven, so a pattern naming an origin would stop matching
 * for anyone whose `VITE_API_URL` differs. Nothing is imported from production
 * to derive it — a lane may not widen a public surface to serve itself.
 */
export const api = (path: string) => `*/api/v1${path}`;
