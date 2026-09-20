import { afterEach, describe, expect, test, vi } from "vitest";
import { storedChoice } from "./storage";

/** Storage that keeps what it is given, or refuses outright as a privacy mode does. */
const storage = ({ refuses = false } = {}) => {
  const kept = new Map<string, string>();
  const refuse = () => {
    throw new Error("storage is unavailable");
  };

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

describe("a remembered choice", () => {
  test("is kept under the product's name, as the value it was given", () => {
    const kept = storage();
    const theme = storedChoice("theme");

    theme.write("dark");

    expect(kept.get("quick-tweets:theme")).toBe("dark");
    expect(theme.read()).toBe("dark");
  });

  test("is nothing until one is made, and two choices do not read each other", () => {
    storage();
    storedChoice("theme").write("dark");

    expect(storedChoice("language").read()).toBeNull();
  });

  test("holds for the visit when storage refuses to answer or to keep", () => {
    storage({ refuses: true });
    const language = storedChoice("language");

    expect(() => language.write("ar")).not.toThrow();
    expect(language.read()).toBeNull();
  });
});
