import { describe, expect, it } from "vitest";

import { bodyTextField } from "./bodyText";

const field = bodyTextField("Body");

const messagesOf = (value: unknown) => {
  const result = field.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("bodyTextField — measured after trimming", () => {
  it("refuses a body of white space alone, whichever white space it is", () => {
    for (const blank of ["     ", "\t\t", "\n\r\n", "\u00A0\u00A0", " \u3000 "]) {
      expect(messagesOf(blank)).toEqual(["Body cannot be empty"]);
    }
  });

  it("stores the trimmed text, never the padding", () => {
    expect(field.parse("  hello  ")).toBe("hello");
  });

  it("measures the text that is stored, so padding does not count against the limit", () => {
    const padded = `   ${"a".repeat(280)}   `;

    expect(field.parse(padded)).toBe("a".repeat(280));
  });
});

describe("bodyTextField — a character is a code point", () => {
  it("accepts 280 characters that each take two UTF-16 units", () => {
    expect(field.safeParse("👍".repeat(280)).success).toBe(true);
  });

  it("refuses the 281st character", () => {
    expect(messagesOf("👍".repeat(281))).toEqual(["Body must be at most 280 characters"]);
    expect(messagesOf(`${"a".repeat(280)}👍`)).toEqual(["Body must be at most 280 characters"]);
  });

  it("counts code points, not what a reader sees as one symbol", () => {
    const family = "👨‍👩‍👧"; // five code points joined into one glyph

    expect(field.safeParse(family.repeat(56)).success).toBe(true);
    expect(messagesOf(family.repeat(57))).toEqual(["Body must be at most 280 characters"]);
  });
});

describe("bodyTextField — safe among other readers' words", () => {
  it("refuses a direction control with one message, saying only why", () => {
    expect(messagesOf("hi\u202E")).toEqual(["Body cannot contain text-direction control characters"]);
    expect(messagesOf("\u202E")).toEqual(["Body cannot contain text-direction control characters"]);
  });

  it("refuses text made only of invisible characters, as it refuses white space", () => {
    expect(messagesOf("\u200B\u200B")).toEqual(["Body cannot be empty"]);
  });

  it("normalises before counting: 280 decomposed letters are 280 characters", () => {
    const decomposed = "e\u0301".repeat(280);

    expect(field.parse(decomposed)).toBe("é".repeat(280));
  });

  it("normalises before counting: a letter NFC splits in two counts as two", () => {
    expect(field.safeParse("\u0958".repeat(140)).success).toBe(true);
    expect(messagesOf("\u0958".repeat(141))).toEqual(["Body must be at most 280 characters"]);
  });
});
