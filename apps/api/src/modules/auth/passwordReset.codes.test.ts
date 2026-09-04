import { describe, expect, it } from "vitest";

import { digestResetCode, mintResetCode, resetCode } from "./passwordReset.codes.js";
import { PasswordResetError } from "./passwordReset.errors.js";
import type { ResetCode, ResetCodeFormat } from "./passwordReset.types.js";

// An arbitrary shape, chosen only to exercise the mechanism — the product's
// alphabet and length are supplied by the caller (D1).
const FORMAT: ResetCodeFormat = { alphabet: "ABCDEFGH23456789", length: 6 };

describe("minting", () => {
  it("produces a code of the requested length, drawn only from the alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = mintResetCode(FORMAT);
      expect(code).toHaveLength(FORMAT.length);
      expect([...code].every((c) => FORMAT.alphabet.includes(c))).toBe(true);
    }
  });

  it("does not repeat itself", () => {
    const minted = new Set(Array.from({ length: 200 }, () => mintResetCode(FORMAT)));
    expect(minted.size).toBeGreaterThan(190);
  });

  it("reaches most of the alphabet, so no character is starved", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      for (const c of mintResetCode(FORMAT)) seen.add(c);
    }
    expect(seen.size).toBe(FORMAT.alphabet.length);
  });

  it("honours a different format without any change to the mechanism", () => {
    const other: ResetCodeFormat = { alphabet: "01", length: 12 };
    const code = mintResetCode(other);
    expect(code).toHaveLength(12);
    expect(/^[01]{12}$/.test(code)).toBe(true);
  });
});

describe("a format that could not produce a meaningful code", () => {
  const broken: [string, ResetCodeFormat][] = [
    ["an empty alphabet", { alphabet: "", length: 6 }],
    ["a single-character alphabet", { alphabet: "A", length: 6 }],
    ["an alphabet of one repeated character", { alphabet: "AAAA", length: 6 }],
    ["no length", { alphabet: "AB", length: 0 }],
    ["a negative length", { alphabet: "AB", length: -1 }],
  ];

  for (const [label, format] of broken) {
    it(`is refused by minting — ${label}`, () => {
      expect(() => mintResetCode(format)).toThrow(PasswordResetError);
    });

    it(`is refused by validation — ${label}`, () => {
      expect(() => resetCode("AB", format)).toThrow(PasswordResetError);
    });
  }

  it("is reported as a format fault, not as a mistyped code", () => {
    try {
      mintResetCode({ alphabet: "A", length: 6 });
      expect.unreachable("expected a rejection");
    } catch (error) {
      expect((error as PasswordResetError).code).toBe("invalid_format");
    }
  });

  it("still admits a weak-but-usable format — this is a floor, not an entropy policy", () => {
    const minimal: ResetCodeFormat = { alphabet: "01", length: 1 };

    const code = mintResetCode(minimal);
    expect(code).toHaveLength(1);
    expect(resetCode(code, minimal)).toBe(code);
  });
});

describe("validation before lookup", () => {
  it("accepts a freshly minted code", () => {
    const code = mintResetCode(FORMAT);
    expect(resetCode(code, FORMAT)).toBe(code);
  });

  const rejected: [string, string][] = [
    ["too short", "ABC"],
    ["too long", "ABCDEFGH"],
    ["a character outside the alphabet", "ABCDE1"],
    ["lower case", "abcdef"],
    ["empty", ""],
    ["whitespace padded", " ABCDE"],
  ];

  for (const [label, value] of rejected) {
    it(`rejects ${label}`, () => {
      expect(() => resetCode(value, FORMAT)).toThrow(PasswordResetError);
    });
  }

  it("does not echo the rejected value in the error", () => {
    try {
      resetCode("SECRET99", FORMAT);
      expect.unreachable("expected a rejection");
    } catch (error) {
      expect((error as Error).message).not.toContain("SECRET99");
      expect((error as PasswordResetError).code).toBe("invalid_code");
    }
  });
});

describe("digest", () => {
  it("is stable for one code and different across codes", () => {
    const a = "AAAAAA" as ResetCode;
    const b = "BBBBBB" as ResetCode;
    expect(digestResetCode(a)).toBe(digestResetCode(a));
    expect(digestResetCode(a)).not.toBe(digestResetCode(b));
  });

  it("never reveals the code itself", () => {
    const code = "ABC234" as ResetCode;
    expect(digestResetCode(code)).not.toContain(code);
    expect(digestResetCode(code)).toMatch(/^[0-9a-f]{64}$/);
  });

});
