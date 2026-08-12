import { describe, expect, it } from "vitest";

import {
  challengeCode,
  challengeCodeMatches,
  digestChallengeCode,
  mintChallengeCode,
} from "./channelVerification.codes.js";
import { ChannelVerificationError } from "./channelVerification.errors.js";
import type { ChallengeCode, ChallengeCodeFormat } from "./channelVerification.types.js";

// An arbitrary shape, chosen only to exercise the mechanism — the product's
// alphabet and length are supplied by the caller.
const FORMAT: ChallengeCodeFormat = { alphabet: "ABCDEFGH23456789", length: 6 };

describe("minting", () => {
  it("produces a code of the requested length, drawn only from the alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = mintChallengeCode(FORMAT);
      expect(code).toHaveLength(FORMAT.length);
      expect([...code].every((c) => FORMAT.alphabet.includes(c))).toBe(true);
    }
  });

  it("does not repeat itself", () => {
    const minted = new Set(Array.from({ length: 200 }, () => mintChallengeCode(FORMAT)));
    expect(minted.size).toBeGreaterThan(190);
  });

  it("reaches most of the alphabet, so no character is starved", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      for (const c of mintChallengeCode(FORMAT)) seen.add(c);
    }
    expect(seen.size).toBe(FORMAT.alphabet.length);
  });

  it("honours a different format without any change to the mechanism", () => {
    const other: ChallengeCodeFormat = { alphabet: "01", length: 12 };
    const code = mintChallengeCode(other);
    expect(code).toHaveLength(12);
    expect(/^[01]{12}$/.test(code)).toBe(true);
  });
});

describe("a format that could not produce a meaningful code", () => {
  const broken: [string, ChallengeCodeFormat][] = [
    ["an empty alphabet", { alphabet: "", length: 6 }],
    ["a single-character alphabet", { alphabet: "A", length: 6 }],
    ["an alphabet of one repeated character", { alphabet: "AAAA", length: 6 }],
    ["no length", { alphabet: "AB", length: 0 }],
    ["a negative length", { alphabet: "AB", length: -1 }],
  ];

  for (const [label, format] of broken) {
    it(`is refused by minting — ${label}`, () => {
      expect(() => mintChallengeCode(format)).toThrow(ChannelVerificationError);
    });

    it(`is refused by validation — ${label}`, () => {
      expect(() => challengeCode("AB", format)).toThrow(ChannelVerificationError);
    });
  }

  it("is reported as a format fault, not as a mistyped code", () => {
    try {
      mintChallengeCode({ alphabet: "A", length: 6 });
      expect.unreachable("expected a rejection");
    } catch (error) {
      expect((error as ChannelVerificationError).code).toBe("invalid_format");
    }
  });

  it("still admits a weak-but-usable format — this is a floor, not an entropy policy", () => {
    const minimal: ChallengeCodeFormat = { alphabet: "01", length: 1 };

    const code = mintChallengeCode(minimal);
    expect(code).toHaveLength(1);
    expect(challengeCode(code, minimal)).toBe(code);
  });
});

describe("validation before lookup", () => {
  it("accepts a freshly minted code", () => {
    const code = mintChallengeCode(FORMAT);
    expect(challengeCode(code, FORMAT)).toBe(code);
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
      expect(() => challengeCode(value, FORMAT)).toThrow(ChannelVerificationError);
    });
  }

  it("does not echo the rejected value in the error", () => {
    try {
      challengeCode("SECRET99", FORMAT);
      expect.unreachable("expected a rejection");
    } catch (error) {
      expect((error as Error).message).not.toContain("SECRET99");
      expect((error as ChannelVerificationError).code).toBe("invalid_code");
    }
  });
});

describe("digest and comparison", () => {
  it("is stable for one code and different across codes", () => {
    const a = "AAAAAA" as ChallengeCode;
    const b = "BBBBBB" as ChallengeCode;
    expect(digestChallengeCode(a)).toBe(digestChallengeCode(a));
    expect(digestChallengeCode(a)).not.toBe(digestChallengeCode(b));
  });

  it("never reveals the code itself", () => {
    const code = "ABC234" as ChallengeCode;
    expect(digestChallengeCode(code)).not.toContain(code);
    expect(digestChallengeCode(code)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the code that produced the digest, and nothing else", () => {
    const code = mintChallengeCode(FORMAT);
    const stored = digestChallengeCode(code);

    expect(challengeCodeMatches(code, stored)).toBe(true);
    expect(challengeCodeMatches("ZZZZZZ" as ChallengeCode, stored)).toBe(false);
  });

  it("treats a stored value of another shape as a mismatch, not an error", () => {
    const code = mintChallengeCode(FORMAT);
    expect(challengeCodeMatches(code, "")).toBe(false);
    expect(challengeCodeMatches(code, "abcd")).toBe(false);
  });
});
