// Media client — the public read-URL helper and the authenticated upload.
// (Pre-auth avatar upload was retired with the upload grant in the auth-first
// migration, ADR 0008: registration is account creation only, and avatar upload
// is an authenticated User/Profile action — POST /media under Bearer, then
// PATCH /users/me.)

import { authClient } from "./authClient";
import { unwrap, type ApiEnvelope } from "./envelope";
import { API_BASE_URL } from "./config";

// The read endpoint is mounted top-level, outside /api/v1, so strip the version
// prefix from the API base to build /media/:token URLs.
const MEDIA_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/** Absolute URL that streams a media object by its read token (GET /media/:token). */
export const mediaUrl = (token: string): string => `${MEDIA_ORIGIN}/media/${token}`;

/** What the server derived from the bytes, not what the client declared. */
export interface UploadedMedia {
  token: string;
  contentType: string;
  size: number;
}

/**
 * The shared 10s timeout is sized for a JSON round trip. Bytes take longer, and
 * a timeout is retried twice, so the shared value would report failure roughly
 * half a minute after a slow upload was already in flight.
 */
const UPLOAD_TIMEOUT = 60_000;

/** Uploads one image and returns the reference a feature endpoint accepts. */
export const uploadMedia = async (
  file: File,
  client = authClient,
): Promise<UploadedMedia> => {
  const body = new FormData();
  body.append("file", file);

  const res = await client.post<ApiEnvelope<UploadedMedia>>("/media", body, {
    timeout: UPLOAD_TIMEOUT,
  });

  return unwrap(res);
};
