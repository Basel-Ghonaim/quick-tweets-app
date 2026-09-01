/**
 * The key derivation — the two properties the controls depend on, and the one
 * they deliberately do not have.
 */

import { describe, expect, it } from "vitest";

import { recipientKey } from "./recipientKey.js";

describe("case cannot be used to get a second allowance", () => {
  it("treats the same address in any case as one recipient", () => {
    const variants = [
      "holder@example.test",
      "Holder@example.test",
      "HOLDER@EXAMPLE.TEST",
      "hOlDeR@ExAmPlE.tEsT",
    ];

    const keys = new Set(variants.map(recipientKey));

    expect(keys.size).toBe(1);
  });

  it("still separates genuinely different recipients", () => {
    expect(recipientKey("a@example.test")).not.toBe(recipientKey("b@example.test"));
  });
});

describe("the address is not recoverable from the key", () => {
  const address = "holder@example.test";

  it("does not contain the address, in any case", () => {
    const key = recipientKey(address);

    expect(key).not.toContain("holder");
    expect(key).not.toContain("example");
    expect(key.toLowerCase()).not.toContain(address.toLowerCase());
  });

  it("is a fixed-width digest whatever the address length", () => {
    expect(recipientKey("a@b.c")).toHaveLength(64);
    expect(recipientKey(`${"x".repeat(500)}@example.test`)).toHaveLength(64);
  });

  it("is stable across calls, so a key computed today matches one from before", () => {
    expect(recipientKey(address)).toBe(recipientKey(address));
  });
});

describe("normalisation stops at case, on purpose", () => {
  it("does not merge dotted local parts, which some providers treat as distinct", () => {
    expect(recipientKey("first.last@example.test")).not.toBe(recipientKey("firstlast@example.test"));
  });

  it("does not strip plus-tags, for the same reason", () => {
    expect(recipientKey("holder+news@example.test")).not.toBe(recipientKey("holder@example.test"));
  });

  it("does not trim surrounding whitespace, which is not a case difference", () => {
    expect(recipientKey(" holder@example.test")).not.toBe(recipientKey("holder@example.test"));
  });
});
