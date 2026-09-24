import { describe, expect, it } from "vitest";

import { bodyTextField } from "./bodyText";

const field = bodyTextField("Body");

const messagesOf = (value: unknown) => {
  const result = field.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("bodyTextField — measured after trimming", () => {
  it("refuses a body of white space alone, whichever white space it is", () => {
    for (const blank of ["     ", "\t\t", "\n\r\n", "  ", " 　 "]) {
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
