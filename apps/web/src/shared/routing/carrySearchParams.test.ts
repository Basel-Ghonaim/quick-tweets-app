import { describe, expect, it } from "vitest";
import { carrySearchParams } from "./carrySearchParams";

/**
 * These assert the function's contract, not a flow the application runs:
 * `PreservedSearchParams` has no provider, so every caller passes an empty list
 * and only the second case below is currently reachable. They are kept because
 * the contract is what a provider will bind to, and it is cheaper to hold it
 * correct than to rediscover it.
 */

const from = (query: string) => new URLSearchParams(query);

describe("carrying a search parameter across a navigation", () => {
  it("carries a named parameter the current location holds", () => {
    expect(carrySearchParams("/target", ["carried"], from("carried=on"))).toBe(
      "/target?carried=on",
    );
  });

  it("carries nothing when nothing is named", () => {
    expect(carrySearchParams("/target", [], from("carried=on"))).toBe("/target");
  });

  it("carries nothing when the current location does not hold it", () => {
    expect(carrySearchParams("/target", ["carried"], from(""))).toBe("/target");
  });

  it("leaves a value the caller wrote itself", () => {
    // A parameter written into the target is a decision; a carried one is a
    // default, so it must never overwrite.
    expect(
      carrySearchParams("/target?carried=own", ["carried"], from("carried=on")),
    ).toBe("/target?carried=own");
  });

  it("keeps the target's own parameters alongside the carried one", () => {
    expect(carrySearchParams("/target?token=abc", ["carried"], from("carried=on"))).toBe(
      "/target?token=abc&carried=on",
    );
  });

  it("keeps a fragment, which sits after the query", () => {
    expect(carrySearchParams("/target#form", ["carried"], from("carried=on"))).toBe(
      "/target?carried=on#form",
    );
  });

  it("carries more than one name", () => {
    expect(carrySearchParams("/target", ["a", "b"], from("a=1&b=2&c=3"))).toBe(
      "/target?a=1&b=2",
    );
  });
});
