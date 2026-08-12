import { describe, it, expect } from "vitest";
import { matchesPattern, isLengthChecked, isMatch } from "@shared/schema-form";

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

describe("isMatch — cross-field match (#249)", () => {
  const matchPassword = isMatch("password");

  it("passes while the field itself is still empty (presence is isRequired's job)", () => {
    expect(matchPassword("", { password: "secret" })).toBeNull();
  });

  it("flags a mismatch even when the target field is still empty", () => {
    // The previously-masked case: the old `if (!target) return null` silently
    // suppressed a real mismatch whenever the target was empty.
    expect(matchPassword("secret", { password: "" })).toBe("Fields do not match");
  });

  it("passes when the two values match", () => {
    expect(matchPassword("secret", { password: "secret" })).toBeNull();
  });

  it("flags a mismatch when both are set and differ", () => {
    expect(matchPassword("secret", { password: "other" })).toBe(
      "Fields do not match",
    );
  });
});
