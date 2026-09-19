import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/** Key parity (ADR 0010 Decision 4): the token checker reads the union of definitions,
 *  which equals a per-resolution check only once every resolution declares the same keys. */

const RESOLUTION = join(process.cwd(), "src/shared/design-system/foundations/resolution");

// Every axis is listed, because one missing here is an axis whose resolutions may drift apart.
const AXES = [
  { dir: "theme", keys: "semantic", resolutions: ["light", "dark"] },
  { dir: "script", keys: "text-style", resolutions: ["latin", "arabic"] },
] as const;

function keysDefinedIn(dir: string, file: string): Set<string> {
  const css = readFileSync(join(RESOLUTION, dir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
}

function symmetricDifference(a: Set<string>, b: Set<string>): string[] {
  return [
    ...[...a].filter((key) => !b.has(key)),
    ...[...b].filter((key) => !a.has(key)),
  ].sort();
}

describe("resolution key parity", () => {
  for (const { dir, keys, resolutions: [first, second] } of AXES) {
    test(`${first} and ${second} resolve an identical ${keys} key set`, () => {
      const a = keysDefinedIn(dir, `${first}.css`);
      const b = keysDefinedIn(dir, `${second}.css`);
      // Guard against a vacuous pass: two empty sets are trivially equal, so a
      // parsing regression could hide a real divergence. Require a real inventory.
      expect(a.size).toBeGreaterThan(10);
      expect(b.size).toBeGreaterThan(10);
      expect(symmetricDifference(a, b)).toEqual([]);
    });
  }

  test("the comparison reports a key present in only one resolution", () => {
    expect(symmetricDifference(new Set(["--a", "--b"]), new Set(["--a"]))).toEqual(["--b"]);
  });
});
