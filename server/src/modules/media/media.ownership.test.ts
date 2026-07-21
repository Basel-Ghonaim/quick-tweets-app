// Media ownership — attach-authorization guards (ADR 0005 D5) + usage accounting.

import { describe, expect, it, vi } from "vitest";

import { MediaAttachError } from "./media.errors";
import { storageKey } from "./media.keys";
import { createMediaOwnership } from "./media.ownership";
import { mintToken } from "./media.tokens";
import type { IMediaRepository, MediaObject } from "./media.types";

const OWNER = 42;

const ownedObject = (over: Partial<MediaObject> = {}): MediaObject => ({
  id: 7,
  token: mintToken(),
  storageKey: storageKey("objects/x"),
  contentType: "image/png",
  size: 120,
  status: "ready",
  uploaderId: OWNER,
  grantId: null,
  grantExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const makeRepo = (over: Partial<IMediaRepository> = {}): IMediaRepository => ({
  create: async () => { throw new Error("unused"); },
  findByToken: async () => null,
  countByGrant: async () => 0,
  adoptById: async () => false,
  findTokenById: async () => null,
  usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
  addReference: async () => {},
  removeReference: async () => {},
  countReferences: async () => 0,
  ...over,
});

const attach = (repo: IMediaRepository, token: string, ownerId = OWNER) =>
  createMediaOwnership(repo)
    .authorizeAttach({ token, ownerId })
    .catch((e: unknown) => e);

describe("media ownership — authorizeAttach", () => {
  it("authorizes the owner attaching their own servable object", async () => {
    const object = ownedObject();
    const ownership = createMediaOwnership(makeRepo({ findByToken: async () => object }));

    const result = await ownership.authorizeAttach({ token: object.token, ownerId: OWNER });

    expect(result).toEqual({ referenceId: object.id, token: object.token });
  });

  it("refuses a cross-principal attach (another principal's object)", async () => {
    const object = ownedObject({ uploaderId: 99 });

    const err = await attach(makeRepo({ findByToken: async () => object }), object.token);

    expect(err).toBeInstanceOf(MediaAttachError);
    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses an unadopted, grant-provenance object (it has no owner yet)", async () => {
    const object = ownedObject({ uploaderId: null, grantId: "g1" });

    const err = await attach(makeRepo({ findByToken: async () => object }), object.token);

    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses a non-servable object (deleted tombstone)", async () => {
    const object = ownedObject({ status: "deleted" });

    const err = await attach(makeRepo({ findByToken: async () => object }), object.token);

    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses an unknown reference with the same opaque error", async () => {
    const err = await attach(makeRepo({ findByToken: async () => null }), mintToken());

    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses a malformed token before any lookup", async () => {
    const findByToken = vi.fn(async () => null);

    const err = await attach(makeRepo({ findByToken }), "has/slash");

    expect((err as MediaAttachError).code).toBe("not_attachable");
    expect(findByToken).not.toHaveBeenCalled();
  });
});

describe("media ownership — usageFor", () => {
  it("returns the principal's aggregate footprint from the registry", async () => {
    const usageFor = vi.fn(async () => ({ objectCount: 3, totalBytes: 900 }));
    const ownership = createMediaOwnership(makeRepo({ usageFor }));

    expect(await ownership.usageFor(OWNER)).toEqual({ objectCount: 3, totalBytes: 900 });
    expect(usageFor).toHaveBeenCalledWith(OWNER, undefined);
  });
});
