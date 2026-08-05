import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Key parity (ADR 0010 Decision 4), and the mechanism that closes the token
 * checker's blind spot: a union-of-definitions check is equivalent to a
 * per-theme one only once the key sets are identical.
 */

const THEME_DIR = join(process.cwd(), "src/shared/design-system/foundations/resolution/theme");

function keysDefinedIn(file: string): Set<string> {
  const css = readFileSync(join(THEME_DIR, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
}

function symmetricDifference(a: Set<string>, b: Set<string>): string[] {
  return [
    ...[...a].filter((key) => !b.has(key)),
    ...[...b].filter((key) => !a.has(key)),
  ].sort();
}

describe("theme key parity", () => {
  test("light and dark resolve an identical semantic key set", () => {
    const light = keysDefinedIn("light.css");
    const dark = keysDefinedIn("dark.css");
    // Guard against a vacuous pass: two empty sets are trivially equal, so a
    // parsing regression could hide a real divergence. Require a real inventory.
    expect(light.size).toBeGreaterThan(10);
    expect(dark.size).toBeGreaterThan(10);
    expect(symmetricDifference(light, dark)).toEqual([]);
  });

  test("the comparison reports a key present in only one theme", () => {
    expect(symmetricDifference(new Set(["--a", "--b"]), new Set(["--a"]))).toEqual(["--b"]);
  });
});
