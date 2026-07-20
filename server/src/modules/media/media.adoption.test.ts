/**
 * Media adoption — guard tests (ADR 0007: attach with grant evidence).
 *
 * Drives `createMediaAdoption` with a mock registry and real grants so every
 * guard is exercised against the actual grant verification: grant-binding,
 * provenance/adoptability, and the conditional atomic write (the replay guard).
 * A fake transaction client is passed straight through — the repo mock ignores
 * it; the auth-side test proves it is the caller's transaction.
 */

import { describe, expect, it, vi } from "vitest";

import { createMediaAdoption } from "./media.adoption";
import { MediaAdoptionError } from "./media.errors";
import { mintUploadGrant, verifyUploadGrant } from "./media.grants";
import { storageKey } from "./media.keys";
import { generateAccessToken } from "../../shared/utils/jwt.js";
import { mintToken } from "./media.tokens";
import type { IMediaRepository, MediaObject } from "./media.types";

const TX = { __tx: true } as never; // opaque stand-in for a transaction client

/** A grant + its verified id, so a matching object can be constructed. */
const freshGrant = () => {
  const { grant } = mintUploadGrant();
  return { grant, id: verifyUploadGrant(grant).id };
};

const grantObject = (grantId: string, over: Partial<MediaObject> = {}): MediaObject => ({
  id: 7,
  token: mintToken(),
  storageKey: storageKey("objects/x"),
  contentType: "image/png",
  size: 10,
  status: "ready",
  uploaderId: null, // grant provenance: unadopted
  grantId,
  grantExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const makeRepo = (over: Partial<IMediaRepository> = {}): IMediaRepository => ({
  create: async () => { throw new Error("unused"); },
  findByToken: async () => null,
  countByGrant: async () => 0,
  adoptById: async () => true,
  findTokenById: async () => null,
  usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
  ...over,
});

describe("media adoption", () => {
  it("adopts a grant-provenance, unadopted object and returns its reference + token", async () => {
    const { grant, id: grantId } = freshGrant();
    const object = grantObject(grantId);
    const adoptById = vi.fn(async () => true);
    const adoption = createMediaAdoption(makeRepo({ findByToken: async () => object, adoptById }));

    const result = await adoption.adopt({ token: object.token, grant, ownerId: 99 }, TX);

    expect(result).toEqual({ referenceId: object.id, token: object.token });
    // The conditional write is guarded by id + owner + the bound grant.
    expect(adoptById).toHaveBeenCalledWith(object.id, 99, grantId, TX);
  });

  it("rejects a grant that does not match the object's recorded provenance (binding)", async () => {
    const { grant } = freshGrant(); // this grant
    const other = freshGrant(); // object was ingested under a different grant
    const object = grantObject(other.id);
    const adoptById = vi.fn(async () => true);
    const adoption = createMediaAdoption(makeRepo({ findByToken: async () => object, adoptById }));

    const err = await adoption
      .adopt({ token: object.token, grant, ownerId: 1 }, TX)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaAdoptionError);
    expect((err as MediaAdoptionError).code).toBe("invalid_evidence");
    expect(adoptById).not.toHaveBeenCalled(); // no write attempted
  });

  it("rejects an unknown reference opaquely (no token-existence oracle)", async () => {
    const { grant } = freshGrant();
    const adoption = createMediaAdoption(makeRepo({ findByToken: async () => null }));

    const err = await adoption
      .adopt({ token: mintToken(), grant, ownerId: 1 }, TX)
      .catch((e: unknown) => e);

    expect((err as MediaAdoptionError).code).toBe("invalid_evidence");
  });

  it("rejects a malformed token before any lookup", async () => {
    const { grant } = freshGrant();
    const findByToken = vi.fn(async () => null);
    const adoption = createMediaAdoption(makeRepo({ findByToken }));

    const err = await adoption
      .adopt({ token: "has/slash", grant, ownerId: 1 }, TX)
      .catch((e: unknown) => e);

    expect((err as MediaAdoptionError).code).toBe("invalid_evidence");
    expect(findByToken).not.toHaveBeenCalled();
  });

  it("rejects an invalid grant (including an access token presented as a grant)", async () => {
    const object = grantObject("whatever");
    const adoption = createMediaAdoption(makeRepo({ findByToken: async () => object }));

    for (const grant of ["garbage", generateAccessToken(5)]) {
      const err = await adoption
        .adopt({ token: object.token, grant, ownerId: 1 }, TX)
        .catch((e: unknown) => e);
      expect((err as MediaAdoptionError).code).toBe("invalid_evidence");
    }
  });

  it("rejects an object that is not grant-provenance (an authenticated upload)", async () => {
    const { grant } = freshGrant();
    const object = grantObject("ignored", { grantId: null, uploaderId: 3 });
    const adoption = createMediaAdoption(makeRepo({ findByToken: async () => object }));

    const err = await adoption
      .adopt({ token: object.token, grant, ownerId: 1 }, TX)
      .catch((e: unknown) => e);

    expect((err as MediaAdoptionError).code).toBe("invalid_evidence");
  });

  it("reports already-adopted (conflict) when the object already has an owner", async () => {
    const { grant, id: grantId } = freshGrant();
    const object = grantObject(grantId, { uploaderId: 55 }); // bound, but taken
    const adoption = createMediaAdoption(makeRepo({ findByToken: async () => object }));

    const err = await adoption
      .adopt({ token: object.token, grant, ownerId: 1 }, TX)
      .catch((e: unknown) => e);

    expect((err as MediaAdoptionError).code).toBe("already_adopted");
  });

  it("reports already-adopted when the conditional write loses the race (0 rows)", async () => {
    const { grant, id: grantId } = freshGrant();
    const object = grantObject(grantId); // adoptable at read time...
    const adoption = createMediaAdoption(
      makeRepo({ findByToken: async () => object, adoptById: async () => false }), // ...but the guarded update matched none
    );

    const err = await adoption
      .adopt({ token: object.token, grant, ownerId: 1 }, TX)
      .catch((e: unknown) => e);

    expect((err as MediaAdoptionError).code).toBe("already_adopted");
  });

  it("resolves a numeric reference to its public read token", async () => {
    const token = mintToken();
    const adoption = createMediaAdoption(makeRepo({ findTokenById: async () => token }));
    expect(await adoption.resolveAvatarToken(7)).toBe(token);
  });
});
