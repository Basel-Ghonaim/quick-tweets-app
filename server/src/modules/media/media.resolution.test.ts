// Media reference resolution — internal references → public read tokens (ADR 0005 D3).

import { describe, expect, it, vi } from "vitest";

import { createMediaResolution } from "./media.resolution";
import { mintToken } from "./media.tokens";
import type { IMediaRepository, MediaToken } from "./media.types";

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

describe("media resolution", () => {
  it("resolves many references in a single registry query", async () => {
    const [a, b] = [mintToken(), mintToken()];
    const findTokensByIds = vi.fn(async () => new Map([[1, a], [2, b]]));
    const resolution = createMediaResolution(makeRepo({ findTokensByIds }));

    const result = await resolution.resolveTokens([1, 2]);

    expect(result.get(1)).toBe(a);
    expect(result.get(2)).toBe(b);
    expect(findTokensByIds).toHaveBeenCalledTimes(1); // batched, not per reference
  });

  it("resolves a single reference to its public read token", async () => {
    const token = mintToken();
    const resolution = createMediaResolution(
      makeRepo({ findTokensByIds: async () => new Map([[7, token]]) }),
    );

    expect(await resolution.resolveToken(7)).toBe(token);
  });

  it("returns null for a reference that does not resolve to a servable object", async () => {
    // The registry omits non-ready objects, so a caller can never surface a
    // token that would fail to read.
    const resolution = createMediaResolution(makeRepo({ findTokensByIds: async () => new Map() }));

    expect(await resolution.resolveToken(7)).toBeNull();
  });

  it("omits unresolvable references rather than failing the whole batch", async () => {
    const token = mintToken();
    const resolution = createMediaResolution(
      makeRepo({ findTokensByIds: async () => new Map([[1, token]]) }),
    );

    const result = await resolution.resolveTokens([1, 2]);

    expect(result.get(1)).toBe(token);
    expect(result.has(2)).toBe(false);
  });

  it("does not query the registry for an empty reference list", async () => {
    const findTokensByIds = vi.fn(async () => new Map<number, MediaToken>());
    const resolution = createMediaResolution(makeRepo({ findTokensByIds }));

    expect((await resolution.resolveTokens([])).size).toBe(0);
  });
});
