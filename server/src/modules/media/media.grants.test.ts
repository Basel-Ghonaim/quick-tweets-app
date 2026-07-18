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

  it("rejects an auth access token presented as a grant (forward wall)", () => {
    const accessToken = generateAccessToken(1);
    expect(() => verifyUploadGrant(accessToken)).toThrow(MediaGrantError);
  });

  it("rejects a grant presented as an access token (reverse wall — the DoS guard)", () => {
    // A grant has no numeric userId, so access-token verification must reject
    // it — otherwise an anonymously-minted grant would pass authGuard.
    const { grant } = mintUploadGrant();
    expect(() => verifyAccessToken(grant)).toThrow(AppError);
  });

  it("rejects a token with the wrong typ even when validly signed", () => {
    const forged = jwt.sign({ gid: "abc123", typ: "something_else" }, env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: 60,
    });
    expect(() => verifyUploadGrant(forged)).toThrow(MediaGrantError);
  });

  it("rejects an expired grant", () => {
    const expired = jwt.sign(
      { gid: "abc123", typ: "media_upload_grant" },
      env.JWT_SECRET,
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
