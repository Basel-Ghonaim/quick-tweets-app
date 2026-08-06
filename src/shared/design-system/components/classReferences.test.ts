import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Every `styles.x` a component reads must exist in its stylesheet.
 *
 * A CSS Module resolves an unknown class to `undefined`, the class composer
 * drops it, and the element renders unstyled — with no error, no failing test
 * and no compiler complaint. A stylesheet rename that misses one call site is
 * therefore invisible to every other gate we have, which is how one shipped:
 * a root class was renamed in the component and left behind in the stylesheet.
 *
 * Scoped per component root rather than per file, because a component's parts
 * import the stylesheet that its root owns.
 */

const COMPONENTS = join(process.cwd(), "src/shared/design-system/components");

const filesUnder = (dir: string, ext: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });

/** Class names in selector position — including inside compound selectors. */
const definedIn = (css: string): Set<string> => {
  const withoutBodies = css.replace(/\{[^}]*\}/g, " ");
  return new Set(
    [...withoutBodies.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]),
  );
};

const referencedIn = (source: string): string[] => [
  ...[...source.matchAll(/styles\.([A-Za-z_]\w*)/g)].map((m) => m[1]),
  ...[...source.matchAll(/styles\[`([^`$]*)`\]/g)].map((m) => m[1]),
];

/** Component roots: a directory holding its own stylesheet. */
const componentRoots = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(COMPONENTS, entry.name))
  .filter((dir) => filesUnder(dir, ".module.css").length > 0);

describe("component class references", () => {
  test("every referenced class exists in its component's stylesheet", () => {
    // A clean result is only trustworthy if the scan saw the components: zero
    // references would pass vacuously if the traversal or the patterns broke.
    expect(componentRoots.length).toBeGreaterThan(2);

    const missing: string[] = [];
    let referenceCount = 0;

    for (const root of componentRoots) {
      const defined = new Set<string>();
      for (const css of filesUnder(root, ".module.css")) {
        for (const name of definedIn(readFileSync(css, "utf8"))) defined.add(name);
      }

      for (const source of filesUnder(root, ".tsx")) {
        if (source.endsWith(".stories.tsx")) continue;
        for (const name of referencedIn(readFileSync(source, "utf8"))) {
          referenceCount += 1;
          if (!defined.has(name)) {
            missing.push(
              `${relative(COMPONENTS, source).split(sep).join("/")} — .${name}`,
            );
          }
        }
      }
    }

    expect(referenceCount).toBeGreaterThan(30);
    expect(missing.sort()).toEqual([]);
  });
});
