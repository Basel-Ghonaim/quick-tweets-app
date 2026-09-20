import { describe, expect, test } from "vitest";
import { CATALOGUES } from "./catalogues";
import type { Catalogue } from "./shape";
import { ARABIC } from "./arabic";

const arabic = CATALOGUES.ar;
const COUNTS = [0, 1, 2, 3, 11, 100];

/** What each count reads as, for the three nouns the catalogue counts. */
const FORMS = {
  characters: ["0 \u062D\u0631\u0641", "\u062D\u0631\u0641 \u0648\u0627\u062D\u062F", "\u062D\u0631\u0641\u064A\u0646", "3 \u0623\u062D\u0631\u0641", "11 \u062D\u0631\u0641\u064B\u0627", "100 \u062D\u0631\u0641"],
  seconds: ["0 \u062B\u0627\u0646\u064A\u0629", "\u062B\u0627\u0646\u064A\u0629 \u0648\u0627\u062D\u062F\u0629", "\u062B\u0627\u0646\u064A\u062A\u064A\u0646", "3 \u062B\u0648\u0627\u0646\u064D", "11 \u062B\u0627\u0646\u064A\u0629", "100 \u062B\u0627\u0646\u064A\u0629"],
  files: ["0 \u0645\u0644\u0641", "\u0645\u0644\u0641 \u0648\u0627\u062D\u062F", "\u0645\u0644\u0641\u064A\u0646", "3 \u0645\u0644\u0641\u0627\u062A", "11 \u0645\u0644\u0641\u064B\u0627", "100 \u0645\u0644\u0641"],
};

/** Every line that takes a count, with the noun it counts. */
const COUNTED: [string, (n: number) => string, keyof typeof FORMS][] = [
  ["the name's limit", arabic.auth.profile.nameTooLong, "characters"],
  ["the bio's limit", arabic.auth.profile.bioTooLong, "characters"],
  ["the shortest a field may be", (n) => arabic.validation.minLength(n).message, "characters"],
  ["the longest a field may be", (n) => arabic.validation.maxLength(n).message, "characters"],
  ["verification's resend wait", arabic.auth.verify.resendIn, "seconds"],
  ["recovery's resend wait", arabic.auth.recovery.resendIn, "seconds"],
  ["the files chosen", arabic.controls.files.chosenCount, "files"],
];

const EASTERN_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/;

describe("the Arabic catalogue", () => {
  test("is registered, and is a whole catalogue", () => {
    // The annotation is the proof, and the typecheck lane holds it; this assertion cannot fail.
    const whole: Catalogue = ARABIC;

    expect(arabic).toBe(ARABIC);
    expect(whole).toBe(ARABIC);
  });

  test.each(COUNTED)("%s chooses its form by Arabic's plural rules", (_, line, noun) => {
    COUNTS.forEach((count, index) => expect(line(count)).toContain(FORMS[noun][index]));
  });

  test("writes every number in Western digits", () => {
    const lines = [
      arabic.auth.verify.resendIn(1234),
      arabic.auth.profile.bioCount(12, 160),
      arabic.auth.recovery.codeSubtitle("j***@example.com"),
      arabic.controls.file.size(1536),
      arabic.controls.files.chosenCount(25),
    ];

    for (const line of lines) expect(line).not.toMatch(EASTERN_DIGITS);
    expect(lines[0]).toContain("1234");
    expect(lines[1]).toBe("12 / 160");
  });

  test("holds apart a value it did not write, and symbols a right-to-left line would reverse", () => {
    expect(arabic.auth.recovery.codeSubtitle("j***@example.com")).toContain(
      "\u2066j***@example.com\u2069",
    );
    expect(arabic.controls.file.notAccepted("photo.png")).toContain("\u2068photo.png\u2069");
    expect(arabic.validation.passwordComplexity.special).toContain("\u2066@$!%*?&#\u2069");
  });
});
