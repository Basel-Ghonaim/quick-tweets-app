import { describe, expect, it } from "vitest";

import { isInvisibleOnly, readerTextField } from "./readerText";

const field = readerTextField("Text");
const CONTROLS = /[\u202A-\u202E\u2066-\u2069]/u;

const messagesOf = (value: string) => {
  const result = field.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("readerTextField — stored in NFC", () => {
  it("composes a letter written as a base and a combining mark", () => {
    expect(field.parse("e\u0301")).toBe("é");
  });

  it("leaves text already in NFC exactly as it was", () => {
    expect(field.parse("مرحبا café 👍")).toBe("مرحبا café 👍");
  });
});

describe("readerTextField — direction controls are refused", () => {
  it("refuses both ends of each range", () => {
    for (const control of ["\u202A", "\u202E", "\u2066", "\u2069"]) {
      expect(messagesOf(`a${control}b`)).toEqual(["Text cannot contain text-direction control characters"]);
    }
  });

  it("accepts the characters just outside the ranges", () => {
    for (const neighbour of ["\u2029", "\u202F", "⁥", "\u206A"]) {
      expect(messagesOf(`a${neighbour}b`)).toEqual([]);
    }
  });

  it("accepts the direction marks, which Arabic text needs", () => {
    for (const mark of ["\u200E", "\u200F", "\u061C"]) {
      expect(messagesOf(`a${mark}b`)).toEqual([]);
    }
  });

  it("never repeats the refused character in what it says", () => {
    const messages = messagesOf("a\u202Eb");

    expect(messages).toHaveLength(1);
    expect(CONTROLS.test(messages[0])).toBe(false);
  });
});

describe("isInvisibleOnly — nothing a reader would see", () => {
  it("is true for white space and the default-ignorables", () => {
    for (const blank of ["", "   ", "\u200B\u200C\u200D", "\uFEFF", "\u200E\u200F\u061C", "\u3164", "\uFE0F", "\u00AD"]) {
      expect(isInvisibleOnly(blank)).toBe(true);
    }
  });

  it("is false once anything visible is there", () => {
    for (const seen of ["a", "مرحبا", "👨‍👩‍👧", "\u200Ba"]) {
      expect(isInvisibleOnly(seen)).toBe(false);
    }
  });

  it("treats the braille blank as a symbol, not as invisible", () => {
    expect(isInvisibleOnly("⠀")).toBe(false);
  });
});
