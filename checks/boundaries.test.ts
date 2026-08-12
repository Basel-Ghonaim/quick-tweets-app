import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The dependency boundaries [ADR 0013](../docs/architecture/decisions/0013-applications-and-cross-tier-packages.md)
 * fixes, enforced rather than asserted.
 *
 * Until the applications shared one dependency graph, the boundary between them
 * was held by an accident of installation: each tier's packages lived in its own
 * `node_modules`, so the web physically could not resolve `express`. Hoisting
 * removed that accident — the ADR records it as the trade-off accepted for one
 * graph — and this check is what replaces it. An accident is not a control.
 *
 * This is a repository-level check. It runs inside the web job today only
 * because that job exists; it belongs to no application, which is why it lives
 * here rather than inside one.
 */

const ROOT = process.cwd();
const SCOPE = "@quick-tweets/";
const SKIP = new Set(["node_modules", "dist", "generated", "storybook-static"]);

/**
 * Import and re-export specifiers: with a `from` clause, as a bare side-effect
 * import, dynamic, and `require`.
 *
 * The side-effect form is not an edge case — `import "@quick-tweets/api"` names
 * no binding and so is invisible to any pattern that expects `from`. It was the
 * first thing this check failed to catch, and the reason it is proved against an
 * injected violation rather than trusted.
 */
const SPECIFIER =
  /(?:import|export)\s[^;'"]*?from\s*["']([^"']+)["']|\bimport\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']/g;

const unitsIn = (group: string): string[] => {
  const dir = join(ROOT, group);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(dir, e.name));
};

const sourcesUnder = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourcesUnder(path);
    return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) ? [path] : [];
  });
};

const specifiersIn = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(SPECIFIER)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? m[4])
    .filter((s): s is string => Boolean(s));

/** The unit a specifier reaches, by package name or by resolved path — or null. */
const targetOf = (specifier: string, file: string, units: Map<string, string>): string | null => {
  if (specifier.startsWith(SCOPE)) {
    const name = specifier.slice(SCOPE.length).split("/")[0];
    return units.has(name) ? name : null;
  }
  if (!specifier.startsWith(".")) return null;
  const resolved = resolve(join(file, ".."), specifier);
  for (const [name, dir] of units) {
    const rel = relative(dir, resolved);
    if (rel && !rel.startsWith("..") && !rel.startsWith(sep)) return name;
  }
  return null;
};

const apps = unitsIn("apps");
const packages = unitsIn("packages");

const byName = (dirs: string[]): Map<string, string> =>
  new Map(dirs.map((d) => [d.split(sep).pop() as string, d]));

const APP_UNITS = byName(apps);
const PACKAGE_UNITS = byName(packages);

/** Every cross-unit reach out of `dirs`, as readable violations. */
const reachesFrom = (dirs: string[], targets: Map<string, string>): string[] =>
  dirs.flatMap((dir) => {
    const self = dir.split(sep).pop();
    return sourcesUnder(dir).flatMap((file) =>
      specifiersIn(file)
        .map((s) => ({ s, target: targetOf(s, file, targets) }))
        .filter(({ target }) => target !== null && target !== self)
        .map(({ s, target }) => `${relative(ROOT, file)} → ${target} (${s})`),
    );
  });

describe("ADR 0013 dependency boundaries", () => {
  test("the applications exist and are discoverable", () => {
    // Guards the check itself: a rule that silently stops finding its subjects
    // passes forever. If `apps/` is ever restructured, this fails first.
    expect(apps.map((d) => d.split(sep).pop()).sort()).toEqual(["api", "web"]);
    apps.forEach((dir) => expect(statSync(join(dir, "src")).isDirectory()).toBe(true));
  });

  test("no application imports another application", () => {
    expect(reachesFrom(apps, APP_UNITS)).toEqual([]);
  });

  test("no package imports an application", () => {
    expect(reachesFrom(packages, APP_UNITS)).toEqual([]);
  });

  test("no package imports another package", () => {
    // ADR 0013: a package carries no runtime dependencies of any kind, neither
    // external nor another package. Admitting one is a decision taken at the
    // time, requiring an acyclic and declared justification.
    expect(reachesFrom(packages, PACKAGE_UNITS)).toEqual([]);
  });
});
