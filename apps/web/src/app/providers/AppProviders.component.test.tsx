import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { CATALOGUES } from "@shared/copy";
import { setupLocalisation } from "@shared/localisation";
import { AppProviders } from "./AppProviders";

const browserPrefers = (...languages: string[]) =>
  Object.defineProperty(window.navigator, "languages", { value: languages, configurable: true });

const documentReads = () => ({
  lang: document.documentElement.getAttribute("lang"),
  dir: document.documentElement.getAttribute("dir"),
});

afterEach(() => {
  delete (window.navigator as { languages?: unknown }).languages;
  setupLocalisation(CATALOGUES);
});

describe("the app's providers", () => {
  test("keep the document in the reader's language as the browser's changes", () => {
    browserPrefers("en");
    // English's words under a right-to-left code: only the code and its direction are read here.
    setupLocalisation({ en: CATALOGUES.en, ar: CATALOGUES.en });

    render(<AppProviders>{null}</AppProviders>);
    expect(documentReads()).toEqual({ lang: "en", dir: "ltr" });

    act(() => {
      browserPrefers("ar-EG");
      window.dispatchEvent(new Event("languagechange"));
    });
    expect(documentReads()).toEqual({ lang: "ar", dir: "rtl" });
  });
});
