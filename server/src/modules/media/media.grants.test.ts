/**
 * Upload grants — unit tests for minting and verification (ADR 0007).
 *
 * The load-bearing cases: mint→verify round-trips; the `typ` claim wall — an
 * auth access token can never pass as a grant (and a tampered/expired grant
 * fails) — and the policy constants are pinned against silent drift.
 */

import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import { env } from "../../config/env.js";
import { generateAccessToken, verifyAccessToken } from "../../shared/utils/jwt.js";
import { AppError } from "../../shared/errors/index.js";
import { MediaGrantError } from "./media.errors";
import {
  GRANT_MAX_OBJECTS,
  GRANT_TTL_SECONDS,
  mintUploadGrant,
  verifyUploadGrant,
} from "./media.grants";

describe("upload grants", () => {
  it("mints a grant that verifies back to its identity and expiry", () => {
    const before = Date.now();
    const { grant, expiresAt } = mintUploadGrant();

    const verified = verifyUploadGrant(grant);
    expect(verified.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verified.expiresAt.getTime()).toBeGreaterThan(before);
    // The client-facing expiresAt and the embedded exp agree (within JWT's 1s granularity).
    expect(Math.abs(verified.expiresAt.getTime() - expiresAt.getTime())).toBeLessThan(1500);
  });

  it("mints distinct grant identities", () => {
    expect(verifyUploadGrant(mintUploadGrant().grant).id).not.toBe(
      verifyUploadGrant(mintUploadGrant().grant).id,
    );
  });

  // ── Cross-domain separation: the security property is the SIGNING KEY, not
  //    the payload shape. Each token below carries userId AND typ, so both
  //    shape checks would pass — only the key differs, and that alone rejects.

  it("key separation: a grant-key token that satisfies BOTH shape checks fails access-token verification", () => {
    const crossToken = jwt.sign(
      { userId: 99, gid: "abc123", typ: "media_upload_grant" },
      env.MEDIA_GRANT_SECRET,
      { algorithm: "HS256", expiresIn: 60 },
    );
    // verifyAccessToken uses JWT_SECRET → signature fails before any payload check.
    expect(() => verifyAccessToken(crossToken)).toThrow(AppError);
  });

  it("key separation: an auth-key token that satisfies BOTH shape checks fails grant verification", () => {
    const crossToken = jwt.sign(
      { userId: 1, gid: "abc123", typ: "media_upload_grant" },
      env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: 60 },
    );
    // verifyUploadGrant uses MEDIA_GRANT_SECRET → signature fails first.
    expect(() => verifyUploadGrant(crossToken)).toThrow(MediaGrantError);
  });

  it("rejects a real access token presented as a grant, and a real grant presented as an access token", () => {
    expect(() => verifyUploadGrant(generateAccessToken(1))).toThrow(MediaGrantError);
    expect(() => verifyAccessToken(mintUploadGrant().grant)).toThrow(AppError);
  });

  // ── Defense in depth: within a single key domain, the payload-shape checks
  //    still reject the wrong shape.

  it("defense in depth: a grant-key token with the wrong typ is rejected", () => {
    const forged = jwt.sign({ gid: "abc123", typ: "something_else" }, env.MEDIA_GRANT_SECRET, {
      algorithm: "HS256",
      expiresIn: 60,
    });
    expect(() => verifyUploadGrant(forged)).toThrow(MediaGrantError);
  });

  it("defense in depth: an auth-key token lacking a numeric userId is rejected", () => {
    const forged = jwt.sign({ typ: "media_upload_grant" }, env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: 60,
    });
    expect(() => verifyAccessToken(forged)).toThrow(AppError);
  });

  it("rejects an expired grant", () => {
    const expired = jwt.sign(
      { gid: "abc123", typ: "media_upload_grant" },
      env.MEDIA_GRANT_SECRET,
      { algorithm: "HS256", expiresIn: -10 },
    );
    const err = ((): unknown => {
      try {
        verifyUploadGrant(expired);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(MediaGrantError);
    expect((err as MediaGrantError).code).toBe("invalid_grant");
  });

  it("rejects garbage and empty strings", () => {
    expect(() => verifyUploadGrant("")).toThrow(MediaGrantError);
    expect(() => verifyUploadGrant("not-a-jwt")).toThrow(MediaGrantError);
  });

  it("pins the policy data (regression traps for silent policy drift)", () => {
    expect(GRANT_TTL_SECONDS).toBe(15 * 60);
    expect(GRANT_MAX_OBJECTS).toBe(1);
  });
});
