import { describe, expect, it } from "vitest";
import { carrySearchParams } from "./carrySearchParams";

const from = (query: string) => new URLSearchParams(query);

describe("carrying a search parameter across an auth navigation", () => {
  it("carries a named parameter the current location holds", () => {
    expect(carrySearchParams("/auth/signup", ["design"], from("design=proposed"))).toBe(
      "/auth/signup?design=proposed",
    );
  });

  it("carries nothing when nothing is named", () => {
    expect(carrySearchParams("/auth/signup", [], from("design=proposed"))).toBe("/auth/signup");
  });

  it("carries nothing when the current location does not hold it", () => {
    expect(carrySearchParams("/auth/signup", ["design"], from(""))).toBe("/auth/signup");
  });

  it("leaves a value the caller wrote itself", () => {
    // A parameter written into the target is a decision; a carried one is a
    // default, so it must never overwrite.
    expect(
      carrySearchParams("/auth/signup?design=bootstrap", ["design"], from("design=proposed")),
    ).toBe("/auth/signup?design=bootstrap");
  });

  it("keeps the target's own parameters alongside the carried one", () => {
    expect(carrySearchParams("/auth/reset?token=abc", ["design"], from("design=proposed"))).toBe(
      "/auth/reset?token=abc&design=proposed",
    );
  });

  it("keeps a fragment, which sits after the query", () => {
    expect(carrySearchParams("/auth/signup#form", ["design"], from("design=proposed"))).toBe(
      "/auth/signup?design=proposed#form",
    );
  });

  it("carries more than one name", () => {
    expect(carrySearchParams("/auth/x", ["a", "b"], from("a=1&b=2&c=3"))).toBe("/auth/x?a=1&b=2");
  });
});
