// Media reference coordination — begin/end signalling (ADR 0005 D8).

import { describe, expect, it, vi } from "vitest";

import { createMediaReferences } from "./media.references";
import type { IMediaRepository } from "./media.types";

const TX = { __tx: true } as never; // opaque stand-in for a transaction client

const makeRepo = (over: Partial<IMediaRepository> = {}): IMediaRepository => ({
  create: async () => { throw new Error("unused"); },
  findByToken: async () => null,
  findTokensByIds: async () => new Map(),
  usageFor: async () => ({ objectCount: 0, totalBytes: 0 }),
  addReference: async () => {},
  removeReference: async () => {},
  countReferences: async () => 0,
  lockAndFetchByTokens: async () => [],
  ...over,
});

describe("media references — signalling", () => {
  it("records a reference beginning, in the caller's transaction", async () => {
    const addReference = vi.fn(async () => {});
    const refs = createMediaReferences(makeRepo({ addReference }));

    await refs.referenceBegan({ mediaId: 7, referrer: "tweet:1" }, TX);

    expect(addReference).toHaveBeenCalledWith({ mediaId: 7, referrer: "tweet:1" }, TX);
  });

  it("records a reference ending, in the caller's transaction", async () => {
    const removeReference = vi.fn(async () => {});
    const refs = createMediaReferences(makeRepo({ removeReference }));

    await refs.referenceEnded({ mediaId: 7, referrer: "tweet:1" }, TX);

    expect(removeReference).toHaveBeenCalledWith({ mediaId: 7, referrer: "tweet:1" }, TX);
  });

  it("refuses a blank referrer before touching the registry", async () => {
    const addReference = vi.fn(async () => {});
    const refs = createMediaReferences(makeRepo({ addReference }));

    await expect(refs.referenceBegan({ mediaId: 7, referrer: "  " })).rejects.toThrow();
    expect(addReference).not.toHaveBeenCalled();
  });

  it("does not interpret the referrer tag — any non-blank identifier passes through", async () => {
    const addReference = vi.fn(async () => {});
    const refs = createMediaReferences(makeRepo({ addReference }));

    await refs.referenceBegan({ mediaId: 7, referrer: "anything-media-never-parses" });

    expect(addReference).toHaveBeenCalledWith(
      { mediaId: 7, referrer: "anything-media-never-parses" },
      undefined,
    );
  });
});

describe("media references — referenced-ness", () => {
  it("reports an object with no referrers as unreferenced", async () => {
    const refs = createMediaReferences(makeRepo({ countReferences: async () => 0 }));
    expect(await refs.isReferenced(7)).toBe(false);
  });

  it("reports an object as referenced while any referrer remains", async () => {
    // The multi-referrer case: a single remaining referrer still holds the
    // object, which is why referenced-ness cannot be a boolean marker.
    const refs = createMediaReferences(makeRepo({ countReferences: async () => 1 }));
    expect(await refs.isReferenced(7)).toBe(true);
  });
});
