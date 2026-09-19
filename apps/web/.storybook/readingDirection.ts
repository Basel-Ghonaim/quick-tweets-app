import { afterEach, beforeEach, expect } from "vitest";

/**
 * Production always stamps a reading direction on the document, so each run of the browser lane
 * does too: a story proven under no direction was proven in neither.
 */
export const everyStoryReads = (direction: "ltr" | "rtl") => {
  beforeEach(() => {
    document.documentElement.setAttribute("dir", direction);
  });

  // Without it, a run that stopped stamping would pass as the other run and report nothing.
  afterEach(() => {
    expect(document.documentElement.getAttribute("dir")).toBe(direction);
    expect(getComputedStyle(document.documentElement).direction).toBe(direction);
  });
};
