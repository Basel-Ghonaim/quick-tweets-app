/**
 * Media module — content-authoritative validation (ADR 0005 — Decision 7).
 *
 * A pure, transport-independent policy component: the effective type is derived
 * from the file's own bytes — the client-declared type and the file extension
 * are advisory only, and deliberately are not even inputs here. Content that
 * does not verify as an allowed type is rejected, and the returned verified
 * type is the single content-type Media stores (and later serves).
 *
 * Boundary: this component knows nothing about streams, HTTP, storage, or
 * configuration. It publishes its input requirements as data — the head length
 * a caller must supply (`MEDIA_SIGNATURE_HEAD_LENGTH`) and the size limit
 * (`MEDIA_MAX_SIZE_BYTES`) — and pure checks over already-extracted bytes and
 * counts. The ingest boundary owns the streaming mechanics: reading the
 * declared head, counting bytes, aborting mid-stream once the count exceeds
 * the threshold, and mapping a rejection to the reserved HTTP statuses.
 *
 * Allow-list policy: only types whose signature is verifiable and that are not
 * browser-executable (scriptable types such as SVG and HTML are excluded —
 * settled by Decision 7; admitting one is a superseding ADR, not a code change).
 */

import { MediaValidationError } from "./media.errors.js";

/** The verified content-types Media admits. */
export type AllowedMediaType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

// ─── Policy data (the M3 implementation choices, reviewable at a glance) ─────

/**
 * Media size limit (inclusive — content of exactly this size is allowed).
 * Enforced here on the final count and, from the ingest boundary, mid-stream
 * once the running count exceeds it.
 */
export const MEDIA_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

/**
 * The signature table. A signature matches only when every part matches at its
 * offset — offset-sensitive formats (WebP's RIFF container) need both parts, so
 * a bare RIFF prefix never passes as WebP.
 */
interface SignaturePart {
  offset: number;
  bytes: readonly number[];
}

interface Signature {
  type: AllowedMediaType;
  parts: readonly SignaturePart[];
}

const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));

const SIGNATURES: readonly Signature[] = [
  { type: "image/png", parts: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }] },
  { type: "image/jpeg", parts: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  { type: "image/gif", parts: [{ offset: 0, bytes: ascii("GIF87a") }] },
  { type: "image/gif", parts: [{ offset: 0, bytes: ascii("GIF89a") }] },
  {
    type: "image/webp",
    parts: [
      { offset: 0, bytes: ascii("RIFF") },
      { offset: 8, bytes: ascii("WEBP") },
    ],
  },
];

/**
 * How many leading bytes a caller must supply to `detectMediaType` for every
 * signature in the table to be decidable. Derived from the table so a future
 * signature can never silently under-declare it (currently 12 — WebP's `WEBP`
 * part at offset 8).
 */
export const MEDIA_SIGNATURE_HEAD_LENGTH = Math.max(
  ...SIGNATURES.flatMap((sig) => sig.parts.map((p) => p.offset + p.bytes.length)),
);

// ─── Pure checks ─────────────────────────────────────────────────────────────

const matchesAt = (head: Uint8Array, part: SignaturePart): boolean => {
  if (head.length < part.offset + part.bytes.length) return false;
  return part.bytes.every((byte, i) => head[part.offset + i] === byte);
};

/**
 * Derive the effective type from the leading bytes of the content, or `null`
 * when the content does not verify as any allowed type. A truncated head simply
 * fails to match — it never throws.
 */
export function detectMediaType(head: Uint8Array): AllowedMediaType | null {
  const match = SIGNATURES.find((sig) => sig.parts.every((p) => matchesAt(head, p)));
  return match ? match.type : null;
}

/**
 * Verify content against the full policy: within the size limit and verifying
 * as an allowed type. Returns the verified content-type Media will store, or
 * throws `MediaValidationError` (`too_large` / `unsupported_type`).
 */
export function verifyMediaContent(
  head: Uint8Array,
  sizeBytes: number,
): AllowedMediaType {
  // Fail closed on a corrupted count (NaN/negative/non-integer would otherwise
  // slip past a plain `>` comparison and validate).
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0 || sizeBytes > MEDIA_MAX_SIZE_BYTES) {
    throw MediaValidationError.tooLarge(sizeBytes, MEDIA_MAX_SIZE_BYTES);
  }
  const type = detectMediaType(head);
  if (type === null) {
    throw MediaValidationError.unsupportedType();
  }
  return type;
}
