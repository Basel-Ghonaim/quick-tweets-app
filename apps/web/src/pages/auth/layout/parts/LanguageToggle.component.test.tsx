import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGUES, useCopy } from "@shared/copy";
import { formatsFor, setupLocalisation } from "@shared/localisation";
import { LanguageProvider } from "@shared/preferences";
import { LanguageToggle } from "./LanguageToggle";

const Tagline = () => <p>{useCopy().auth.brand.tagline}</p>;

// Storage of this test's own, so what a press keeps can be read, and cannot reach another test.
let kept: Map<string, string>;

beforeEach(() => {
  kept = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setupLocalisation(CATALOGUES);
});

describe("the language control", () => {
  it("switches to the language it names, keeps the choice, and offers the other back", () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
        <Tagline />
      </LanguageProvider>,
    );
    expect(screen.getByText(CATALOGUES.en.auth.brand.tagline)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: formatsFor("ar").languageName("ar") }));

    expect(screen.getByText(CATALOGUES.ar.auth.brand.tagline)).toBeTruthy();
    expect(kept.get("quick-tweets:language")).toBe("ar");
    expect(screen.getByRole("button", { name: formatsFor("en").languageName("en") })).toBeTruthy();
  });
});
