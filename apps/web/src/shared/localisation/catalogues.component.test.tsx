import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { LanguageProvider } from "@shared/preferences";
import { currentCatalogue, setupLocalisation, useCatalogue } from "./catalogues";

interface Words {
  greeting: string;
}

const CATALOGUES: Record<string, Words> = {
  en: { greeting: "Hello" },
  xx: { greeting: "Stand-in greeting" },
};

const Greeting = () => <p>{useCatalogue<Words>().greeting}</p>;

// The provider is what hears the browser change its languages, as the application mounts it.
const showGreeting = () =>
  render(
    <LanguageProvider>
      <Greeting />
    </LanguageProvider>,
  );

const browserPrefers = (...languages: string[]) =>
  Object.defineProperty(window.navigator, "languages", { value: languages, configurable: true });

afterEach(() => {
  delete (window.navigator as { languages?: unknown }).languages;
});

describe("the active catalogue", () => {
  test("is the one registered for the reader's language", () => {
    browserPrefers("xx");
    setupLocalisation(CATALOGUES);

    showGreeting();

    expect(screen.getByText("Stand-in greeting")).toBeTruthy();
    expect(currentCatalogue<Words>().greeting).toBe("Stand-in greeting");
  });

  test("is read again, and rendered again, when the language changes", () => {
    browserPrefers("en");
    setupLocalisation(CATALOGUES);
    showGreeting();
    expect(screen.getByText("Hello")).toBeTruthy();

    act(() => {
      browserPrefers("xx");
      window.dispatchEvent(new Event("languagechange"));
    });

    expect(screen.getByText("Stand-in greeting")).toBeTruthy();
    expect(currentCatalogue<Words>().greeting).toBe("Stand-in greeting");
  });
});
