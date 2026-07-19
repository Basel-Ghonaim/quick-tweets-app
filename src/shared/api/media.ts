// Media client — pre-auth avatar upload (upload-then-submit-reference, ADR 0007)
// and the public read-URL helper. Uses the unauthenticated `apiClient`: the
// register flow has no session yet, and this must not trigger auth's 401 refresh.

import { apiClient } from "./client";
import { API_BASE_URL } from "./config";
import { unwrap, type ApiEnvelope } from "./envelope";

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
 * Upload an avatar under a freshly minted upload grant, returning the object's
 * read token plus the grant — the adoption evidence submitted with registration.
 * A failure here rejects, so the register flow surfaces it and never proceeds
 * with a broken reference (never a silent discard).
 */
export const uploadAvatar = async (
  file: File,
  client = apiClient,
): Promise<AvatarUpload> => {
  const grantRes = await client.post<ApiEnvelope<{ grant: string; expiresAt: string }>>(
    "/media/grants",
  );
  const { grant } = unwrap(grantRes);

  const form = new FormData();
  form.append("file", file);
  const ingestRes = await client.post<ApiEnvelope<{ token: string; contentType: string; size: number }>>(
    "/media",
    form,
    { headers: { "X-Upload-Grant": grant } },
  );
  const { token } = unwrap(ingestRes);

  return { token, grant };
};
