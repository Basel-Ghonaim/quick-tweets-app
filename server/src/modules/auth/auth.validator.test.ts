/**
 * registerSchema — lowercase-only username invariant (WI-B, #388).
 *
 * The username is validated as lowercase-only and is REJECTED, never normalized:
 * there is no `.toLowerCase()` transform, so a mixed-case value fails rather than
 * being silently coerced to a passing one. Login is untouched here (WI-E).
 */

import { describe, expect, it } from "vitest";

import { registerSchema } from "./auth.validator";

const VALID = { username: "basel_a", name: "Basel", email: "b@example.com", password: "Passw0rd!" };

const usernameError = (input: string): string | undefined => {
  const r = registerSchema.safeParse({ ...VALID, username: input });
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === "username")?.message;
};

describe("registerSchema — lowercase-only username (WI-B)", () => {
  it("accepts lowercase letters, digits, and underscores", () => {
    for (const u of ["basel_a", "user_123", "abcd", "a_b_c_9"]) {
      expect(registerSchema.safeParse({ ...VALID, username: u }).success).toBe(true);
    }
  });

  it("rejects any uppercase letter with the lowercase-charset message", () => {
    for (const u of ["Basel_A", "USER", "aBc1", "basel_A"]) {
      expect(usernameError(u)).toMatch(/lowercase/i);
    }
  });

  it("rejects rather than normalizes — no .toLowerCase() coercion", () => {
    // If a lowercasing transform existed, "MixedCase1" would be coerced and pass.
    // It must FAIL — proving rejection, not silent normalization.
    expect(registerSchema.safeParse({ ...VALID, username: "MixedCase1" }).success).toBe(false);
  });
});
