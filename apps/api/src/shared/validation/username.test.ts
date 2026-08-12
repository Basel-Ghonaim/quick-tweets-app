import { describe, expect, it } from "vitest";

import { usernameField } from "./username";

describe("usernameField — the single username rule", () => {
  it("accepts lowercase letters, digits, and underscores (4–20 chars)", () => {
    for (const u of ["adam", "user_1", "a_b_c_d", "basel_a1"]) {
      expect(usernameField.safeParse(u).success).toBe(true);
    }
  });

  it("rejects uppercase — rejected, never normalized", () => {
    for (const u of ["Adam", "USER", "aBc1"]) {
      expect(usernameField.safeParse(u).success).toBe(false);
    }
  });

  it("rejects out-of-range lengths", () => {
    expect(usernameField.safeParse("abc").success).toBe(false); // < 4
    expect(usernameField.safeParse("a".repeat(21)).success).toBe(false); // > 20
  });
});
