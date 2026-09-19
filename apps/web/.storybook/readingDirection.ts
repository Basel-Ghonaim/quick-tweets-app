import { afterEach, beforeEach, expect } from "vitest";

/**
 * Production always stamps a language and the direction that follows it, so each run of the
 * browser lane does too: a story proven under neither was proven in neither.
 */
export const everyStoryReads = (language: "en" | "ar", direction: "ltr" | "rtl") => {
  beforeEach(() => {
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", direction);
  });

  // Without it, a run that stopped stamping would pass as the other run and report nothing.
  afterEach(() => {
    expect(document.documentElement.getAttribute("lang")).toBe(language);
    expect(document.documentElement.getAttribute("dir")).toBe(direction);
    expect(getComputedStyle(document.documentElement).direction).toBe(direction);
  });
};
