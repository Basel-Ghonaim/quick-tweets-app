/**
 * Media token — unit tests for minting and validation.
 */

import { describe, expect, it } from "vitest";

import { MediaStorageError } from "./media.errors";
import { mediaToken, mintToken } from "./media.tokens";

describe("media token", () => {
  it("mints URL-safe, non-empty tokens", () => {
    const token = mintToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(16);
  });

  it("mints distinct tokens", () => {
    expect(mintToken()).not.toBe(mintToken());
  });

  it("round-trips a minted token through mediaToken()", () => {
    const token = mintToken();
    expect(mediaToken(token)).toBe(token);
  });

  it("rejects malformed tokens", () => {
    expect(() => mediaToken("")).toThrow(MediaStorageError);
    expect(() => mediaToken("has space")).toThrow(MediaStorageError);
    expect(() => mediaToken("has/slash")).toThrow(MediaStorageError);
    expect(() => mediaToken("short")).toThrow(MediaStorageError); // < 16 chars
  });

  it("tags a rejection with the invalid_token code", () => {
    const err = ((): unknown => {
      try {
        mediaToken("not a token!");
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(MediaStorageError);
    expect((err as MediaStorageError).code).toBe("invalid_token");
  });
});
