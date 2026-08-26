import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { THEMES } from "@shared/design-system";

/**
 * The theme is decided twice: once by an inline script that runs before the
 * first paint, and once by the provider after the bundle loads (Finding 0018).
 * They cannot share code — the first runs before any module exists — so nothing
 * but this keeps them from drifting apart.
 *
 * Drift is silent and expensive. If the two ever read the stored value
 * differently the flash returns, or a reader is left in a theme they did not
 * choose, and no other check in the tree reads the markup at all.
 */

const SCRIPT = /<script>([\s\S]*?)<\/script>/;

const prePaintScript = (): string => {
  const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
  const source = SCRIPT.exec(html)?.[1];
  if (!source) throw new Error("no inline script found in index.html");
  return source;
};

/** Runs the script against a stubbed document and reports what it stamped. */
function stamp(options: { stored?: string | null; prefersDark?: boolean }) {
  const attributes = new Map<string, string>();
  const meta = { setAttribute: (k: string, v: string) => attributes.set(k, v) };

  const documentStub = {
    documentElement: {
      setAttribute: (k: string, v: string) => attributes.set(k, v),
    },
    querySelector: () => meta,
  };
  const windowStub = {
    matchMedia: () => ({ matches: options.prefersDark ?? false }),
  };
  const storageStub = {
    getItem: () => {
      if (options.stored === undefined) throw new Error("storage unavailable");
      return options.stored;
    },
  };

  new Function("window", "document", "localStorage", prePaintScript())(
    windowStub,
    documentStub,
    storageStub,
  );

  return {
    theme: attributes.get("data-theme"),
    chrome: attributes.get("content"),
  };
}

describe("the theme applied before first paint", () => {
  test("an explicit choice wins", () => {
    expect(stamp({ stored: "dark" }).theme).toBe("dark");
    expect(stamp({ stored: "light", prefersDark: true }).theme).toBe("light");
  });

  test("the system leads when no choice has been made", () => {
    expect(stamp({ stored: null, prefersDark: true }).theme).toBe("dark");
    expect(stamp({ stored: null, prefersDark: false }).theme).toBe("light");
  });

  test("a stored value outside the theme set is ignored, not stamped", () => {
    expect(stamp({ stored: "midnight", prefersDark: true }).theme).toBe("dark");
    expect(stamp({ stored: "", prefersDark: false }).theme).toBe("light");
  });

  test("unreadable storage still paints", () => {
    // `stored: undefined` makes the stub throw, as a privacy mode does.
    expect(stamp({ prefersDark: true }).theme).toBe("dark");
  });

  test("it only ever stamps a theme the Design System resolves", () => {
    for (const scenario of [
      { stored: "dark" },
      { stored: null, prefersDark: true },
      { stored: "midnight" },
    ])
      expect(THEMES).toContain(stamp(scenario).theme);
  });

  test("the browser chrome is stamped with it", () => {
    expect(stamp({ stored: "dark" }).chrome).toBe("#171424");
    expect(stamp({ stored: "light" }).chrome).toBe("#fafafe");
  });
});
