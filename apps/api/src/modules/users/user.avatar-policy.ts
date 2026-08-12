/**
 * Avatar product policy (ADR 0008 Decision 7) — owned and evaluated by the User
 * domain, over Media's **authoritative** metadata (never client-declared input).
 *
 * The avatar is deliberately stricter than the global Media ingest allow-list:
 * exactly one image, at most 1 MiB, JPEG or PNG only — GIF and WebP are not
 * accepted. (Restricting to JPEG/PNG is the initial product allow-list; APNG is
 * an accepted residual of allowing PNG — a strict static-only rule would need
 * Media to expose animation metadata, a future enhancement, not this migration.)
 * Media never learns "avatar": it exposes `contentType`/`size`; the check is here.
 */

import { AppError } from "../../shared/errors/index.js";

export const AVATAR_ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;
export const AVATAR_MAX_BYTES = 1 * 1024 * 1024; // 1 MiB

/**
 * Enforce the avatar policy over Media-authoritative facts. Throws
 * `AppError.validation` (422) on violation; the offending object is simply left
 * unreferenced-owned (no request-level byte cleanup — ADR 0008 Decision 9).
 */
export const assertAvatarPolicy = (contentType: string, size: number): void => {
  const errors: string[] = [];
  if (!(AVATAR_ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    errors.push("Avatar must be a JPEG or PNG image");
  }
  if (size > AVATAR_MAX_BYTES) {
    errors.push("Avatar must be at most 1 MiB");
  }
  if (errors.length > 0) {
    throw AppError.validation("Avatar does not meet the requirements", { avatar: errors });
  }
};
