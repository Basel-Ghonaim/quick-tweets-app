import { describe, expect, it } from "vitest";
import {
  AUTH_DESIGN_MODES,
  AUTH_DESIGN_PARAM,
  DEFAULT_AUTH_DESIGN_MODE,
  oppositeAuthDesignMode,
  parseAuthDesignMode,
} from "./authDesignMode";

describe("auth design mode", () => {
  it("defaults to the shipping design, so unrelated work is unaffected", () => {
    expect(DEFAULT_AUTH_DESIGN_MODE).toBe("bootstrap");
  });

  it("parses both modes", () => {
    expect(parseAuthDesignMode("bootstrap")).toBe("bootstrap");
    expect(parseAuthDesignMode("proposed")).toBe("proposed");
  });

  it("falls back to the default rather than throwing on a mistyped URL", () => {
    expect(parseAuthDesignMode("propsed")).toBe(DEFAULT_AUTH_DESIGN_MODE);
    expect(parseAuthDesignMode("")).toBe(DEFAULT_AUTH_DESIGN_MODE);
    expect(parseAuthDesignMode("legacy")).toBe(DEFAULT_AUTH_DESIGN_MODE);
  });

  it("treats an absent parameter as the default", () => {
    expect(parseAuthDesignMode(null)).toBe(DEFAULT_AUTH_DESIGN_MODE);
    expect(parseAuthDesignMode(undefined)).toBe(DEFAULT_AUTH_DESIGN_MODE);
  });

  it("tolerates case and surrounding whitespace, since the URL is hand-edited", () => {
    expect(parseAuthDesignMode("Proposed")).toBe("proposed");
    expect(parseAuthDesignMode("  PROPOSED  ")).toBe("proposed");
    expect(parseAuthDesignMode(" Bootstrap ")).toBe("bootstrap");
  });

  it("toggles between exactly two modes", () => {
    expect(oppositeAuthDesignMode("bootstrap")).toBe("proposed");
    expect(oppositeAuthDesignMode("proposed")).toBe("bootstrap");
  });

  it("keeps the parameter name and the mode set fixed", () => {
    expect(AUTH_DESIGN_PARAM).toBe("design");
    expect([...AUTH_DESIGN_MODES]).toEqual(["bootstrap", "proposed"]);
  });
});
