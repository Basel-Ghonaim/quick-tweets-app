import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGUES, type Catalogue } from "@shared/copy";
import { setupLocalisation } from "@shared/localisation";
import { setLanguage } from "@shared/preferences";
import { Placeholder } from "./Placeholder";

// Storage of this test's own, so a choice one case makes cannot reach the next, whatever the renderer keeps.
beforeEach(() => {
  const kept = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setupLocalisation(CATALOGUES);
});

describe("a change of language", () => {
  it.each([
    ["a surface not built yet", { surface: "feed" } as const, (c: Catalogue) => c.placeholder.notBuiltTitle.feed],
    ["an address that names nothing", {}, (c: Catalogue) => c.placeholder.unknownTitle],
  ])("re-renders %s in the new language, without a reload", (_, props, title) => {
    render(<Placeholder {...props} />);
    expect(screen.getByText(title(CATALOGUES.en))).toBeTruthy();

    act(() => setLanguage("ar"));

    expect(screen.getByText(title(CATALOGUES.ar))).toBeTruthy();
    expect(screen.queryByText(title(CATALOGUES.en))).toBeNull();
  });
});
