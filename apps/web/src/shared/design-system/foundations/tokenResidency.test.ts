import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Mechanical enforcement of residency (D21): a key is declared *either*
 * axis-invariantly under `tokens/` *or* under a resolution axis in `resolution/`
 * — never both.
 *
 * The rule is not a preference, and the cost of breaking it is silent. `:root`
 * and `[data-theme="x"]` match the same element at equal specificity, and the
 * token files load after the resolutions, so a key declared in both would have
 * its `:root` copy outrank *every* theme rather than be overridden by one. Worse,
 * `tokenContrast` resolves a theme before the root, the opposite order — so the
 * page would render one value while the contrast check certified another.
 */

const FOUNDATIONS = join(process.cwd(), "src/shared/design-system/foundations");

const cssFilesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return cssFilesUnder(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

/** Keys declared under a selector matching `selectorTest`, with where they came from. */
function declaredIn(dirs: string[], selectorTest: (selector: string) => boolean) {
  const found = new Map<string, string>();
  for (const dir of dirs) {
    for (const file of cssFilesUnder(join(FOUNDATIONS, dir))) {
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const block of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
        if (!selectorTest(block[1].trim())) continue;
        for (const decl of block[2].matchAll(/(--[\w-]+)\s*:/g)) {
          found.set(decl[1], relative(FOUNDATIONS, file).split(sep).join("/"));
        }
      }
    }
  }
  return found;
}

const axisInvariant = declaredIn(["tokens"], (s) => s === ":root");
const axisResolved = declaredIn(["resolution"], (s) =>
  s.startsWith("[data-theme"),
);

describe("token residency", () => {
  test("no key is declared both axis-invariantly and under a resolution axis", () => {
    // A clean result is only trustworthy if the scan saw the system: two empty
    // maps intersect to nothing, so a parsing regression would pass vacuously.
    expect(axisInvariant.size).toBeGreaterThan(50);
    expect(axisResolved.size).toBeGreaterThan(20);

    const violations = [...axisInvariant.entries()]
      .filter(([key]) => axisResolved.has(key))
      .map(([key, file]) => `${key} — ${file} and ${axisResolved.get(key)}`)
      .sort();

    expect(violations).toEqual([]);
  });
});
