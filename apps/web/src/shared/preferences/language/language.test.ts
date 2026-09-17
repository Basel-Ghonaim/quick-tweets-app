import { describe, expect, test } from "vitest";
import { directionOf, resolveLanguage } from "./language";

const registered = ["en", "ar"];

describe("the reader's language", () => {
  test("a stored choice wins when it names a registered language exactly", () => {
    expect(resolveLanguage({ stored: "ar", browser: ["en-US"], registered })).toBe("ar");
    expect(resolveLanguage({ stored: "ar-EG", browser: ["en-US"], registered })).toBe("en");
    expect(resolveLanguage({ stored: "fr", browser: ["ar"], registered })).toBe("ar");
  });

  test("otherwise the browser's languages are read in order, on their base language", () => {
    expect(resolveLanguage({ stored: null, browser: ["fr-CA", "AR-eg", "en"], registered })).toBe("ar");
    expect(resolveLanguage({ stored: null, browser: ["en-GB", "ar"], registered })).toBe("en");
  });

  test("English, when nothing the reader has names a registered language", () => {
    expect(resolveLanguage({ stored: "midnight", browser: ["de", "ja-JP"], registered })).toBe("en");
    expect(resolveLanguage({ stored: null, browser: [], registered: ["en"] })).toBe("en");
  });

  test("the direction follows the language", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});
