import { describe, expect, it } from "vitest";

import { destinationFor } from "./destinationFor";

describe("where the onboarding route sends a reader", () => {
  it("waits while the position is unknown", () => {
    expect(destinationFor({ status: "unresolved" })).toBe("pending");
  });

  it("offers a retry rather than ejecting them", () => {
    expect(destinationFor({ status: "failed", unauthorized: false })).toBe("retry");
  });

  it("sends an expired session to sign in", () => {
    expect(destinationFor({ status: "failed", unauthorized: true })).toBe("signin");
  });

  it("sends only a definitive none to the feed", () => {
    expect(
      destinationFor({ status: "resolved", state: { phase: "none", profileOutcome: null } }),
    ).toBe("feed");
  });

  for (const phase of ["profile", "verify", "code"] as const) {
    it(`shows the ${phase} screen for ${phase}`, () => {
      expect(
        destinationFor({ status: "resolved", state: { phase, profileOutcome: null } }),
      ).toBe(phase);
    });
  }
});
