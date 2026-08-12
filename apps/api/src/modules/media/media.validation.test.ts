/**
 * Content-authoritative validation — unit tests.
 *
 * Pure bytes-in/verdict-out, so every case uses a real magic-byte fixture
 * constructed inline. The load-bearing cases: the verified type comes from the
 * bytes alone (a declared type is not even an input), offset-sensitive
 * signatures match at their offsets (a bare RIFF prefix is not WebP), and
 * scriptable content never passes.
 */

import { describe, expect, it } from "vitest";

import { MediaValidationError } from "./media.errors";
import {
  MEDIA_MAX_SIZE_BYTES,
  MEDIA_SIGNATURE_HEAD_LENGTH,
  detectMediaType,
  verifyMediaContent,
} from "./media.validation";

const bytes = (...values: (number | string)[]): Uint8Array => {
  const out: number[] = [];
  for (const v of values) {
    if (typeof v === "string") for (const c of v) out.push(c.charCodeAt(0));
    else out.push(v);
  }
  return Uint8Array.from(out);
};

const PNG_HEAD = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
const JPEG_HEAD = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0);
const GIF87_HEAD = bytes("GIF87a", 0, 0, 0, 0, 0, 0);
const GIF89_HEAD = bytes("GIF89a", 0, 0, 0, 0, 0, 0);
const WEBP_HEAD = bytes("RIFF", 0x24, 0x00, 0x00, 0x00, "WEBP");

/** Each positive fixture with the byte positions its signature occupies. */
const SIGNATURE_FIXTURES: readonly [string, Uint8Array, number[]][] = [
  ["png", PNG_HEAD, [0, 1, 2, 3, 4, 5, 6, 7]],
  ["jpeg", JPEG_HEAD, [0, 1, 2]],
  ["gif87a", GIF87_HEAD, [0, 1, 2, 3, 4, 5]],
  ["gif89a", GIF89_HEAD, [0, 1, 2, 3, 4, 5]],
  ["webp", WEBP_HEAD, [0, 1, 2, 3, 8, 9, 10, 11]], // RIFF + WEBP; 4-7 is the size field
];

describe("detectMediaType", () => {
  it("derives each allowed type from its signature", () => {
    expect(detectMediaType(PNG_HEAD)).toBe("image/png");
    expect(detectMediaType(JPEG_HEAD)).toBe("image/jpeg");
    expect(detectMediaType(GIF87_HEAD)).toBe("image/gif");
    expect(detectMediaType(GIF89_HEAD)).toBe("image/gif");
    expect(detectMediaType(WEBP_HEAD)).toBe("image/webp");
  });

  it("covers JPEG and WebP variants (EXIF / quantization-first / VP8L)", () => {
    expect(detectMediaType(bytes(0xff, 0xd8, 0xff, 0xe1, 0, 0, 0, 0, 0, 0, 0, 0))).toBe("image/jpeg");
    expect(detectMediaType(bytes(0xff, 0xd8, 0xff, 0xdb, 0, 0, 0, 0, 0, 0, 0, 0))).toBe("image/jpeg");
    expect(detectMediaType(bytes("RIFF", 0x24, 0x00, 0x00, 0x00, "WEBP", "VP8L"))).toBe("image/webp");
  });

  it("rejects a RIFF container that is not WebP (offset-sensitive)", () => {
    const wave = bytes("RIFF", 0x24, 0x00, 0x00, 0x00, "WAVE");
    expect(detectMediaType(wave)).toBeNull();
  });

  it("rejects every single-byte corruption of every signature (full sweep)", () => {
    for (const [name, fixture, positions] of SIGNATURE_FIXTURES) {
      for (const pos of positions) {
        const corrupt = Uint8Array.from(fixture);
        corrupt[pos] = corrupt[pos]! ^ 0xff;
        expect(detectMediaType(corrupt), `${name} byte ${pos}`).toBeNull();
      }
    }
  });

  it("anchors signatures at offset 0 — a shifted signature never matches", () => {
    expect(detectMediaType(bytes(0x00, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0))).toBeNull();
    expect(detectMediaType(bytes(0x00, 0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBeNull();
  });

  it("accepts a head longer than the declared requirement, and an exact minimal signature", () => {
    const long = new Uint8Array(64);
    long.set(PNG_HEAD.slice(0, 8), 0);
    expect(detectMediaType(long)).toBe("image/png");
    expect(detectMediaType(bytes(0xff, 0xd8, 0xff))).toBe("image/jpeg"); // exactly the 3-byte signature
  });

  it("works over Node Buffers, including subarray views with a nonzero byteOffset", () => {
    expect(detectMediaType(Buffer.from(PNG_HEAD))).toBe("image/png");
    const shifted = Buffer.concat([Buffer.from([0x01, 0x02, 0x03]), Buffer.from(PNG_HEAD)]);
    expect(detectMediaType(shifted.subarray(3))).toBe("image/png");
  });

  it("detects an image-prefixed polyglot as its image type (read-side posture owns the rest)", () => {
    // Signature sniffing claims only container identity; a GIF-prefixed body
    // carrying HTML/JS is neutralized at the read boundary (M5: content-derived
    // Content-Type + nosniff — ADR 0005 Decision 7), not here.
    expect(detectMediaType(bytes("GIF89a", "<script>alert(1)</script>"))).toBe("image/gif");
  });

  it("rejects scriptable content (SVG, HTML) and arbitrary bytes", () => {
    expect(detectMediaType(bytes('<svg xmlns="h'))).toBeNull();
    expect(detectMediaType(bytes("<!DOCTYPE htm"))).toBeNull();
    expect(detectMediaType(bytes("hello, world"))).toBeNull();
  });

  it("rejects a real-but-unlisted format (allow-list gating)", () => {
    const bmp = bytes("BM", 0x76, 0x00, 0x00, 0x00, 0, 0, 0, 0, 0, 0);
    expect(detectMediaType(bmp)).toBeNull();
  });

  it("fails closed on truncated or empty heads without throwing", () => {
    expect(detectMediaType(bytes())).toBeNull();
    expect(detectMediaType(PNG_HEAD.slice(0, 4))).toBeNull();
    expect(detectMediaType(bytes("RIFF", 0x24, 0x00, 0x00))).toBeNull(); // cut before offset 8
  });

  it("pins the policy data (regression traps for silent policy drift)", () => {
    // Derived from the table; a new signature extending past byte 12 must
    // consciously update this pin (and the ingest boundary reads it).
    expect(MEDIA_SIGNATURE_HEAD_LENGTH).toBe(12);
    // The settled M3 threshold: 5 MiB. Self-referential assertions elsewhere
    // would pass under any value; this pins the actual policy.
    expect(MEDIA_MAX_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("verifyMediaContent", () => {
  it("returns the verified content-type for valid content within the limit", () => {
    expect(verifyMediaContent(JPEG_HEAD, 1024)).toBe("image/jpeg");
    expect(verifyMediaContent(PNG_HEAD, MEDIA_MAX_SIZE_BYTES)).toBe("image/png"); // at-limit is allowed
  });

  it("the verified type comes from the bytes, not any declaration", () => {
    // JPEG bytes that a client might declare as image/png: the declared type is
    // not an input, so the verified (stored) type is the real one.
    expect(verifyMediaContent(JPEG_HEAD, 1024)).toBe("image/jpeg");
  });

  it("rejects over-limit content with too_large", () => {
    const err = ((): unknown => {
      try {
        verifyMediaContent(PNG_HEAD, MEDIA_MAX_SIZE_BYTES + 1);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(MediaValidationError);
    expect((err as MediaValidationError).code).toBe("too_large");
  });

  it("rejects unverifiable content with unsupported_type", () => {
    const err = ((): unknown => {
      try {
        verifyMediaContent(bytes("<svg onload=x"), 1024);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(MediaValidationError);
    expect((err as MediaValidationError).code).toBe("unsupported_type");
  });

  it("checks size before type: oversized garbage reports too_large (the 413/415 precedence M4 builds on)", () => {
    const err = ((): unknown => {
      try {
        verifyMediaContent(bytes("hello, world"), MEDIA_MAX_SIZE_BYTES + 1);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect((err as MediaValidationError).code).toBe("too_large");
  });

  it("fails closed on degenerate size counts (NaN / negative / non-integer)", () => {
    for (const bad of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      const err = ((): unknown => {
        try {
          verifyMediaContent(PNG_HEAD, bad);
          return null;
        } catch (e) {
          return e;
        }
      })();
      expect(err, `size ${bad}`).toBeInstanceOf(MediaValidationError);
      expect((err as MediaValidationError).code).toBe("too_large");
    }
  });

  it("handles degenerate heads and a zero size (the count is caller-supplied, not cross-checked)", () => {
    expect(() => verifyMediaContent(bytes(), 0)).toThrow(MediaValidationError);
    expect(verifyMediaContent(PNG_HEAD, 0)).toBe("image/png");
  });
});
