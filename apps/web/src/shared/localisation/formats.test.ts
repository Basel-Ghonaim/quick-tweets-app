import { describe, expect, test } from "vitest";
import { formatsFor } from "./formats";
import { localeOf } from "./locale";

const UNITS = {
  bytes: (amount: string) => `${amount} B`,
  kilobytes: (amount: string) => `${amount} KB`,
  megabytes: (amount: string) => `${amount} MB`,
};

describe("how a language writes numbers", () => {
  test("digits and calendar are pinned, even where a region's default differs", () => {
    expect(formatsFor("ar-EG").count(1234)).toBe("1234");
    expect(new Intl.DateTimeFormat(localeOf("fa-IR")).resolvedOptions()).toMatchObject({
      calendar: "gregory",
      numberingSystem: "latn",
    });
  });

  test("a count is whole and ungrouped", () => {
    expect(formatsFor("en").count(12345)).toBe("12345");
    expect(formatsFor("en").count(0)).toBe("0");
  });

  test("the plural form follows the language's own rules", () => {
    const every = { zero: "zero", one: "one", two: "two", few: "few", many: "many", other: "other" };

    expect([1, 2].map((n) => formatsFor("en").plural(n, every))).toEqual(["one", "other"]);
    expect([0, 1, 2, 3, 11, 100].map((n) => formatsFor("ar").plural(n, every))).toEqual([
      "zero", "one", "two", "few", "many", "other",
    ]);
    expect(formatsFor("ar").plural(2, { other: "other" })).toBe("other");
  });

  test("an identifier and a reader's words are each held apart from the line around them", () => {
    expect(formatsFor("en").identifier("j***@example.com")).toBe("\u2066j***@example.com\u2069");
    expect(formatsFor("ar").authored("photo.png")).toBe("\u2068photo.png\u2069");
  });

  test("a language is named in its own words, whichever language asks", () => {
    expect(formatsFor("en").languageName("ar")).toBe("العربية");
    expect(formatsFor("ar").languageName("en")).toBe("English");
  });

  test("a file size takes its unit at 1024, to one decimal, ungrouped", () => {
    const sizes = [0, 1023, 1024, 1536, 1048575, 1048576, 5 * 1048576, 1048576 * 1024];

    expect(sizes.map((bytes) => formatsFor("en").fileSize(bytes, UNITS))).toEqual([
      "0 B", "1023 B", "1.0 KB", "1.5 KB", "1024.0 KB", "1.0 MB", "5.0 MB", "1024.0 MB",
    ]);
  });
});
