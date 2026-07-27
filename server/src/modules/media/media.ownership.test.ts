// Media ownership — attach-authorization guards (ADR 0005 D5) + usage accounting.
//
// authorizeAttach / authorizeAttachMany resolve tokens through a *locking* read
// (`lockAndFetchByTokens`, `FOR UPDATE`) so an attach serializes against
// reclamation (M11). These unit tests drive that repo method with fakes; the
// real row-lock behaviour is proven in media.attach-reclamation.integration.test.ts.

import { describe, expect, it, vi } from "vitest";

import { MediaAttachError } from "./media.errors";
import { createMediaOwnership } from "./media.ownership";
import { mintToken } from "./media.tokens";
import type { IMediaRepository, LockedMediaObject, MediaToken } from "./media.types";

const OWNER = 42;

const lockedRow = (
  token: MediaToken,
  over: Partial<LockedMediaObject> = {},
): LockedMediaObject => ({
  id: 7,
  token,
  uploaderId: OWNER,
  status: "ready",
  contentType: "image/png",
  size: 100,
  ...over,
});

const makeRepo = (over: Partial<IMediaRepository> = {}): IMediaRepository => ({
  create: async () => { throw new Error("unused"); },
  findByToken: async () => null,
  countByGrant: async () => 0,
  adoptById: async () => false,
  findTokensByIds: async () => new Map(),
  usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
  addReference: async () => {},
  removeReference: async () => {},
  countReferences: async () => 0,
  lockAndFetchByTokens: async () => [],
  ...over,
});

const attach = (repo: IMediaRepository, token: string, ownerId = OWNER) =>
  createMediaOwnership(repo)
    .authorizeAttach({ token, ownerId })
    .catch((e: unknown) => e);

describe("media ownership — authorizeAttach", () => {
  it("authorizes the owner attaching their own servable object", async () => {
    const token = mintToken();
    const ownership = createMediaOwnership(
      makeRepo({ lockAndFetchByTokens: async () => [lockedRow(token)] }),
    );

    const result = await ownership.authorizeAttach({ token, ownerId: OWNER });

    expect(result).toEqual({ referenceId: 7, token, contentType: "image/png", size: 100 });
  });

  it("refuses a cross-principal attach (another principal's object)", async () => {
    const token = mintToken();
    const repo = makeRepo({ lockAndFetchByTokens: async () => [lockedRow(token, { uploaderId: 99 })] });

    const err = await attach(repo, token);

    expect(err).toBeInstanceOf(MediaAttachError);
    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses an unadopted, grant-provenance object (it has no owner yet)", async () => {
    const token = mintToken();
    const repo = makeRepo({ lockAndFetchByTokens: async () => [lockedRow(token, { uploaderId: null })] });

    const err = await attach(repo, token);

    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses a non-servable object under the lock (a reclamation tombstone)", async () => {
    const token = mintToken();
    const repo = makeRepo({ lockAndFetchByTokens: async () => [lockedRow(token, { status: "deleted" })] });

    const err = await attach(repo, token);

    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses an unknown reference with the same opaque error", async () => {
    const err = await attach(makeRepo({ lockAndFetchByTokens: async () => [] }), mintToken());

    expect((err as MediaAttachError).code).toBe("not_attachable");
  });

  it("refuses a malformed token before taking any lock", async () => {
    const lockAndFetchByTokens = vi.fn(async () => []);

    const err = await attach(makeRepo({ lockAndFetchByTokens }), "has/slash");

    expect((err as MediaAttachError).code).toBe("not_attachable");
    expect(lockAndFetchByTokens).not.toHaveBeenCalled();
  });
});

describe("media ownership — authorizeAttachMany", () => {
  it("authorizes a batch and returns references in INPUT order (not lock order)", async () => {
    const t1 = mintToken();
    const t2 = mintToken();
    // The repo locks/returns in ascending id order (t2 first); the result must
    // still map back to the caller's input order (t1, t2) so positions hold.
    const ownership = createMediaOwnership(
      makeRepo({
        lockAndFetchByTokens: async () => [
          lockedRow(t2, { id: 2 }),
          lockedRow(t1, { id: 5 }),
        ],
      }),
    );

    const result = await ownership.authorizeAttachMany([
      { token: t1, ownerId: OWNER },
      { token: t2, ownerId: OWNER },
    ]);

    expect(result).toEqual([
      { referenceId: 5, token: t1, contentType: "image/png", size: 100 },
      { referenceId: 2, token: t2, contentType: "image/png", size: 100 },
    ]);
  });

  it("carries the object's authoritative contentType and size for the consumer's policy", async () => {
    const token = mintToken();
    const ownership = createMediaOwnership(
      makeRepo({
        lockAndFetchByTokens: async () => [lockedRow(token, { contentType: "image/jpeg", size: 2048 })],
      }),
    );

    const [result] = await ownership.authorizeAttachMany([{ token, ownerId: OWNER }]);

    expect(result).toMatchObject({ contentType: "image/jpeg", size: 2048 });
  });

  it("refuses the whole batch if any one object is not attachable", async () => {
    const t1 = mintToken();
    const t2 = mintToken();
    const ownership = createMediaOwnership(
      makeRepo({ lockAndFetchByTokens: async () => [lockedRow(t1)] }), // t2 absent
    );

    const err = await ownership
      .authorizeAttachMany([
        { token: t1, ownerId: OWNER },
        { token: t2, ownerId: OWNER },
      ])
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(MediaAttachError);
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
