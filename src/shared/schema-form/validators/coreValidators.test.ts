import { describe, it, expect } from "vitest";
import { matchesPattern, isLengthChecked } from "@shared/schema-form";

// Harness smoke test: proves the frontend unit lane runs — Vitest executes, the
// TypeScript compiles, and the "@shared" alias + public barrel resolve. It
// exercises two real validator primitives with representative cases.
describe("schema-form validators (harness smoke)", () => {
  it("matchesPattern rejects a non-match and passes a match", () => {
    const needsDigit = matchesPattern(/[0-9]/, "needs a digit");
    expect(needsDigit("abc", {})).toBe("needs a digit");
    expect(needsDigit("a1c", {})).toBeNull();
  });

  it("isLengthChecked enforces a max length", () => {
    const max3 = isLengthChecked(undefined, { max: 3, message: "too long" });
    expect(max3("abcd", {})).toBe("too long");
    expect(max3("abc", {})).toBeNull();
  });
});
