import { afterEach, describe, expect, test, vi } from "vitest";
import { currentLanguage, setLanguage, setupLanguages, subscribeToLanguage } from "./languageStore";

const KEY = "quick-tweets:language";

/** A browser that prefers English, with storage that keeps what it is given, or refuses outright. */
const browser = ({ refuses = false } = {}) => {
  const kept = new Map<string, string>();
  const refuse = () => {
    throw new Error("storage is unavailable");
  };
  vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
  vi.stubGlobal("window", {
    localStorage: {
      getItem: refuses ? refuse : (key: string) => kept.get(key) ?? null,
      setItem: refuses ? refuse : (key: string, value: string) => void kept.set(key, value),
    },
  });
  return kept;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the reader's choice of language", () => {
  test("outranks the browser, is kept, and is read back on the next visit", () => {
    const kept = browser();
    setupLanguages(["en", "ar"]);

    setLanguage("ar");

    expect(currentLanguage()).toBe("ar");
    expect(kept.get(KEY)).toBe("ar");

    setupLanguages(["en", "ar"]);
    expect(currentLanguage()).toBe("ar");
  });

  test("holds for the session when storage cannot keep it", () => {
    browser({ refuses: true });
    setupLanguages(["en", "ar"]);

    setLanguage("ar");

    expect(currentLanguage()).toBe("ar");
  });

  test("tells its readers once when it changes the language, and not when it does not", () => {
    browser();
    setupLanguages(["en", "ar"]);
    const heard = vi.fn();
    const stop = subscribeToLanguage(heard);

    setLanguage("ar");
    setLanguage("ar");
    stop();

    expect(heard).toHaveBeenCalledTimes(1);
  });

  test("can name only a language a catalogue exists for", () => {
    const kept = browser();
    setupLanguages(["en", "ar"]);

    expect(() => setLanguage("fr")).toThrow(/cannot be chosen/);
    expect(currentLanguage()).toBe("en");
    expect(kept.has(KEY)).toBe(false);
  });
});
