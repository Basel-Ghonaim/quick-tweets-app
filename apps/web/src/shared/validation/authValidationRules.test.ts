import { describe, it, expect } from "vitest";
import { matchesPattern } from "@shared/schema-form";
import { usernameRules } from "./authValidationRules";
import { VALIDATION_MESSAGES } from "@shared/copy";

// Lowercase-only username rule (WI-B, #388). Exercises the exact validator the
// register form composes — matchesPattern(usernameRules.charset, message) — so
// this proves the field behaviour, not just a bare regex constant. Mirrors the
// backend registerSchema; login is presence-only and untouched here (WI-E).
describe("username charset rule — lowercase-only (WI-B)", () => {
  const validate = matchesPattern(usernameRules.charset, VALIDATION_MESSAGES.usernameCharset);

  it("accepts lowercase letters, digits, and underscores", () => {
    for (const u of ["basel_a", "user_123", "abcd", "a_b_c_9"]) {
      expect(validate(u, {})).toBeNull();
    }
  });

  it("rejects any uppercase letter (no silent normalization)", () => {
    for (const u of ["Basel_A", "USER", "aBc1", "basel_A"]) {
      expect(validate(u, {})).toBe(VALIDATION_MESSAGES.usernameCharset);
    }
  });

  it("the charset message names the lowercase constraint", () => {
    expect(VALIDATION_MESSAGES.usernameCharset.toLowerCase()).toContain("lowercase");
  });
});
