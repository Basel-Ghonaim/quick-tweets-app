import { describe, expect, it } from "vitest";

import { digestSessionKey, maskEndpoint, mintSessionKey } from "./passwordReset.session.js";

describe("the session key", () => {
  it("is unguessable and never repeats", () => {
    const keys = new Set(Array.from({ length: 200 }, mintSessionKey));

    expect(keys.size).toBe(200);
    expect([...keys][0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  /* The plaintext reaches a client, so what is kept cannot reconstruct one. */
  it("is stored as a digest that does not contain it", () => {
    const key = mintSessionKey();
    const digest = digestSessionKey(key);

    expect(digest).toHaveLength(64);
    expect(digest).not.toContain(key);
    expect(digestSessionKey(key)).toBe(digest);
  });
});

describe("the mask a returning reader is shown", () => {
  it("keeps one character of the local part and the whole domain", () => {
    expect(maskEndpoint("baselghonaim@gmail.com")).toBe("b•••••••••••@gmail.com");
  });

  it("never leaves the local part legible, however short", () => {
    expect(maskEndpoint("a@x.test")).toBe("a•@x.test");
  });

  it("says nothing at all about a value it cannot read as an address", () => {
    expect(maskEndpoint("not-an-address")).toBe("•••");
    expect(maskEndpoint("@x.test")).toBe("•••");
  });
});
