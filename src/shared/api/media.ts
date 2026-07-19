// Media client — pre-auth avatar upload (upload-then-submit-reference, ADR 0007)
// and the public read-URL helper. Uses the unauthenticated `apiClient`: the
// register flow has no session yet, and this must not trigger auth's 401 refresh.

import { apiClient } from "./client";
import { API_BASE_URL } from "./config";

// The read endpoint is mounted top-level, outside /api/v1, so strip the version
// prefix from the API base to build /media/:token URLs.
const MEDIA_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/** Absolute URL that streams a media object by its read token (GET /media/:token). */
export const mediaUrl = (token: string): string => `${MEDIA_ORIGIN}/media/${token}`;

export interface AvatarUpload {
  token: string;
  grant: string;
}

/**
 * Read the `{ success, data }` success envelope defensively — repositories in
 * this codebase read `res.data` as the inner payload, so accept both shapes.
 */
const inner = <T>(body: unknown): T => {
  if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
};

/**
 * Upload an avatar under a freshly minted upload grant, returning the object's
 * read token plus the grant — the adoption evidence submitted with registration.
 * A failure here rejects, so the register flow surfaces it and never proceeds
 * with a broken reference (never a silent discard).
 */
export const uploadAvatar = async (
  file: File,
  client = apiClient,
): Promise<AvatarUpload> => {
  const grantRes = await client.post("/media/grants");
  const { grant } = inner<{ grant: string }>(grantRes.data);

  const form = new FormData();
  form.append("file", file);
  const ingestRes = await client.post("/media", form, {
    headers: { "X-Upload-Grant": grant },
  });
  const { token } = inner<{ token: string }>(ingestRes.data);

  return { token, grant };
};
