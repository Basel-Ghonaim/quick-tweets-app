import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { currentLanguage, setupLanguages } from "./languageStore";
import { LanguageProvider } from "./LanguageProvider";

const inAProvider = () => render(<LanguageProvider>{null}</LanguageProvider>);

const browserPrefers = (...languages: string[]) =>
  Object.defineProperty(window.navigator, "languages", { value: languages, configurable: true });

const browserChanges = (...languages: string[]) =>
  act(() => {
    browserPrefers(...languages);
    window.dispatchEvent(new Event("languagechange"));
  });

const documentReads = () => ({
  lang: document.documentElement.getAttribute("lang"),
  dir: document.documentElement.getAttribute("dir"),
});

afterEach(() => {
  delete (window.navigator as { languages?: unknown }).languages;
  vi.unstubAllGlobals();
  setupLanguages(["en"]);
});

describe("the document's language", () => {
  test("is stamped with the active language and the direction it reads in", () => {
    browserPrefers("ar-EG", "en");
    setupLanguages(["en", "ar"]);

    inAProvider();

    expect(documentReads()).toEqual({ lang: "ar", dir: "rtl" });
  });

  test("follows the browser while the reader has chosen nothing", () => {
    browserPrefers("en-US");
    setupLanguages(["en", "ar"]);
    inAProvider();
    expect(documentReads()).toEqual({ lang: "en", dir: "ltr" });

    browserChanges("ar");

    expect(documentReads()).toEqual({ lang: "ar", dir: "rtl" });
  });

  test("holds a stored choice when the browser changes", () => {
    vi.stubGlobal("localStorage", { getItem: (key: string) => (key === "quick-tweets:language" ? "en" : null) });
    browserPrefers("en");
    setupLanguages(["en", "ar"]);
    inAProvider();

    browserChanges("ar");

    expect(documentReads()).toEqual({ lang: "en", dir: "ltr" });
  });

  test("stops listening to the browser once it is gone", () => {
    browserPrefers("en");
    setupLanguages(["en", "ar"]);
    const { unmount } = inAProvider();
    unmount();

    browserChanges("ar");

    expect(currentLanguage()).toBe("en");
  });
});
