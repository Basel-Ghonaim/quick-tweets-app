// Media client — the public read-URL helper. (Pre-auth avatar upload was retired
// with the upload grant in the auth-first migration, ADR 0008: registration is
// account creation only, and avatar upload is an authenticated User/Profile
// action — POST /media under Bearer, then PATCH /users/me.)

import { API_BASE_URL } from "./config";

// The read endpoint is mounted top-level, outside /api/v1, so strip the version
// prefix from the API base to build /media/:token URLs.
const MEDIA_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/** Absolute URL that streams a media object by its read token (GET /media/:token). */
export const mediaUrl = (token: string): string => `${MEDIA_ORIGIN}/media/${token}`;
