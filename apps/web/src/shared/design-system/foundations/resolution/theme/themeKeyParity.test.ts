import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Key parity (ADR 0010 Decision 4), and the mechanism that closes the token
 * checker's blind spot: a union-of-definitions check is equivalent to a
 * per-theme one only once the key sets are identical.
 */

const FOUNDATIONS = join(process.cwd(), "src/shared/design-system/foundations");
const THEME_DIR = join(FOUNDATIONS, "resolution/theme");
// One resolution axis today, iterated as a list so a second would extend it.

function keysDefinedIn(dir: string, file: string): Set<string> {
  const css = readFileSync(join(dir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
}

function symmetricDifference(a: Set<string>, b: Set<string>): string[] {
  return [
    ...[...a].filter((key) => !b.has(key)),
    ...[...b].filter((key) => !a.has(key)),
  ].sort();
}

describe("theme key parity", () => {
  for (const [name, dir] of [["semantic", THEME_DIR]] as const) {
    test(`light and dark resolve an identical ${name} key set`, () => {
      const light = keysDefinedIn(dir, "light.css");
      const dark = keysDefinedIn(dir, "dark.css");
      // Guard against a vacuous pass: two empty sets are trivially equal, so a
      // parsing regression could hide a real divergence. Require a real inventory.
      expect(light.size).toBeGreaterThan(10);
      expect(dark.size).toBeGreaterThan(10);
      expect(symmetricDifference(light, dark)).toEqual([]);
    });
  }

  test("the comparison reports a key present in only one theme", () => {
    expect(symmetricDifference(new Set(["--a", "--b"]), new Set(["--a"]))).toEqual(["--b"]);
  });
});
