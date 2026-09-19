import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setLanguage, setupLanguages } from "./languageStore";
import { useLanguage } from "./useLanguage";

const Reader = () => {
  const { language, languages } = useLanguage();
  return <p>{`${language} of ${languages.join(",")}`}</p>;
};

// Storage of this test's own, so a choice cannot outlive the test whatever the renderer keeps.
beforeEach(() => {
  const kept = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setupLanguages(["en"]);
});

describe("the active language, as a component reads it", () => {
  test("names the choices, and renders again when the reader chooses another", () => {
    setupLanguages(["en", "ar"]);
    render(<Reader />);
    expect(screen.getByText("en of en,ar")).toBeTruthy();

    act(() => setLanguage("ar"));

    expect(screen.getByText("ar of en,ar")).toBeTruthy();
  });
});
