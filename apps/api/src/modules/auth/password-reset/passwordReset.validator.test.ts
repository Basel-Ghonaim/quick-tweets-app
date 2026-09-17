import { describe, expect, it } from "vitest";

import {
  applyResetSchema,
  confirmResetSchema,
  requestResetSchema,
  resendResetSchema,
} from "./passwordReset.validator.js";

describe("request — the address", () => {
  it("accepts a well-formed address, lowercased to match how it was stored", () => {
    expect(requestResetSchema.parse({ email: "User@Example.TEST" })).toEqual({
      email: "user@example.test",
    });
  });

  // Registration's schema orders `.email()` before `.trim()`, so surrounding
  // whitespace fails there too. Matched rather than corrected: a padded
  // address that could reset but not register would be the worse surprise,
  // and the ordering is registration's to change, not this Work Item's.
  it("rejects a padded address, exactly as registration does", () => {
    expect(() => requestResetSchema.parse({ email: "  user@example.test  " })).toThrow();
  });

  it("rejects a malformed address — a caller learns only about what they typed", () => {
    expect(() => requestResetSchema.parse({ email: "not-an-address" })).toThrow();
  });

  it("rejects a missing address", () => {
    expect(() => requestResetSchema.parse({})).toThrow();
  });
});

describe("the submitted code — presence only", () => {
  // The point of these: every one of these values must reach the capability
  // and fail there, identically. If any of them were rejected here instead,
  // "malformed" would answer differently from "wrong", which is the exact
  // distinction the opaque failure exists to deny.
  const shapesThatMustStillReachTheCapability = [
    ["far too short", "A"],
    ["far too long", "A".repeat(64)],
    ["outside the alphabet", "iloveyou1234"],
    ["excluded Crockford letters", "IIIILLLLOOOO"],
    ["lowercase", "abcdefghjkmn"],
    ["punctuation", "ABCD-EFGH-JKM"],
  ] as const;

  for (const [label, code] of shapesThatMustStillReachTheCapability) {
    it(`accepts ${label} at the boundary, leaving the verdict to the capability`, () => {
      expect(confirmResetSchema.parse({ code })).toEqual({ code });
    });
  }

  it("rejects only an absent or empty value — a malformed request, not a failed reset", () => {
    expect(() => confirmResetSchema.parse({})).toThrow();
    expect(() => confirmResetSchema.parse({ code: "" })).toThrow();
  });
});

describe("apply — the new password", () => {
  const CODE = "0123456789AB";

  it("takes a compliant password and nothing else", () => {
    const input = { newPassword: "Str0ng!Passw0rd" };
    expect(applyResetSchema.parse(input)).toEqual(input);
  });

  /* The credential is the position's. A caller able to supply one silently
     would be a second source for it, so it is refused rather than stripped. */
  it("refuses a code rather than dropping it", () => {
    const failure = applyResetSchema.safeParse({
      code: CODE,
      newPassword: "Str0ng!Passw0rd",
    });

    expect(failure.success).toBe(false);
    expect(failure.error?.issues[0]?.path).toEqual(["code"]);
  });

  it("holds the new password to registration's rules", () => {
    for (const weak of ["Sh0rt!", "alllowercase1!", "ALLUPPERCASE1!", "NoDigitsHere!", "NoSymbol1234"]) {
      expect(() => applyResetSchema.parse({ newPassword: weak })).toThrow();
    }
  });

  it("refuses a new password outside printable ASCII, as registration does", () => {
    const failure = applyResetSchema.safeParse({ newPassword: "Str0ng!Passw0rd\u0643" });

    expect(failure.success).toBe(false);
    expect(failure.error?.issues[0]?.path).toEqual(["newPassword"]);
  });

  it("reuses registration's rules rather than restating them — the two cannot drift", async () => {
    const { registerSchema } = await import("../auth.validator.js");
    expect(applyResetSchema.shape.newPassword).toBe(registerSchema.shape.password);
  });
});

describe("resend — the position's, not the caller's", () => {
  it("accepts an empty body, which is the whole of the request", () => {
    expect(resendResetSchema.parse({})).toEqual({});
  });

  /* A caller able to supply an address would be a mint path behind the wrong
     limiter, and a second source for a fact the position owns. */
  it("refuses a supplied address rather than stripping it", () => {
    const failure = resendResetSchema.safeParse({ email: "someone@example.test" });

    expect(failure.success).toBe(false);
    expect(failure.error?.issues[0]?.path).toEqual(["email"]);
  });

  it("refuses a supplied code the same way", () => {
    const failure = resendResetSchema.safeParse({ code: "0123456789AB" });

    expect(failure.success).toBe(false);
    expect(failure.error?.issues[0]?.path).toEqual(["code"]);
  });

  /* The schema is also what keeps a cross-site simple POST out: this is the
     one reset body with no field, so without it no JSON content type is
     needed and nothing would preflight for CORS to refuse. */
  it("refuses a body that never parsed as JSON", () => {
    expect(resendResetSchema.safeParse(undefined).success).toBe(false);
  });
});
