import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Mechanical enforcement of the binding rule (ADR 0010 Decision 3): every
 * `var(--…)` reference must resolve to a definition. Because components build
 * token names by string interpolation, a rename resolves to an undefined custom
 * property at runtime with no compile-time or lint failure — the compiler cannot
 * be the safety net, so this check is.
 *
 * Enforcement follows the tier model (ADR 0010 Decision 3) rather than one rule
 * for every property. A Design Token — defined under foundations/tokens or
 * foundations/theme — must exist: a fallback does not excuse a missing one,
 * because the fallback is exactly what hides the silent rename. A component token
 * — a component's own inline-style key or module-CSS declaration — is
 * runtime-parameterised, so its fallback is its legitimate default. Classification
 * is by definition site, not by name.
 *
 * The check is a union-of-definitions check and is deliberately not theme-aware: a
 * token defined in one theme but not another is a key-parity gap owned elsewhere,
 * not this check's concern.
 */

const SRC = join(process.cwd(), "src");

/**
 * The `color` prop's role union — the domain of every interpolated
 * `var(--color-${color}-…)` reference. It is the check's own source of truth so a
 * rename of any role's token surfaces here instead of resolving to an undefined
 * variable at runtime; it mirrors the `ButtonColor` / `InputColor` /
 * `CheckboxColor` / `FileInputColor` prop unions.
 */
const ROLES = [
  "primary",
  "secondary",
  "success",
  "warning",
  "error",
  "info",
] as const;

type Reference = { name: string; file: string; line: number; scope: string };
type Inventory = {
  designTokens: Set<string>;
  componentTokens: Set<string>;
  references: Reference[];
};

const toPosix = (path: string) => relative(process.cwd(), path).split(sep).join("/");

/** Blank out block-comment bodies while preserving newlines, so a token-shaped
 *  string inside a comment is never mistaken for a real definition or reference,
 *  and reported line numbers stay exact. */
const stripBlockComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "));

function walk(dir: string, extension: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extension, found);
    else if (entry.name.endsWith(extension) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name))
      found.push(full);
  }
  return found;
}

const isDesignTokenSite = (posixPath: string) =>
  posixPath.includes("design-system/foundations/tokens/") ||
  posixPath.includes("design-system/foundations/theme/");

/** The owning unit of a file — the signal that tells a component-local knob (one
 *  owner) from a cross-cutting token (many owners). */
function scopeOf(posixPath: string): string {
  const segments = posixPath.split("/");
  for (const anchor of ["components", "modules", "variants"]) {
    const index = segments.indexOf(anchor);
    if (index >= 0 && segments[index + 1]) return `${anchor}/${segments[index + 1]}`;
  }
  if (posixPath.includes("design-system/foundations")) return "foundations";
  return segments.slice(0, 2).join("/");
}

const familyOf = (name: string) => name.replace(/^--/, "").split("-")[0];
const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;

const DECLARATION = /(--[\w-]+)\s*:/g; // `--x:` — a custom-property declaration
const INLINE_KEY = /["'`](--[\w-]+)["'`]\s*:/g; // `"--x":` — a TSX inline-style key
const LITERAL_REF = /var\(\s*(--[\w-]+)\s*[,)]/g; // `var(--x)` / `var(--x, …)`
const INTERPOLATED_REF = /var\(\s*--color-\$\{[A-Za-z0-9_]+\}-([\w-]+)\)/g; // `var(--color-${role}-suffix)`

function inventory(): Inventory {
  const designTokens = new Set<string>();
  const componentTokens = new Set<string>();
  const references: Reference[] = [];

  const files = [...walk(SRC, ".css"), ...walk(SRC, ".tsx")];
  for (const file of files) {
    const posix = toPosix(file);
    const isCss = file.endsWith(".css");
    const text = stripBlockComments(readFileSync(file, "utf8"));

    if (isCss) {
      for (const match of text.matchAll(DECLARATION)) {
        const bucket = isDesignTokenSite(posix) ? designTokens : componentTokens;
        bucket.add(match[1]);
      }
    } else {
      for (const match of text.matchAll(INLINE_KEY)) componentTokens.add(match[1]);
    }

    for (const match of text.matchAll(LITERAL_REF)) {
      references.push({ name: match[1], file: posix, line: lineOf(text, match.index ?? 0), scope: scopeOf(posix) });
    }
    if (!isCss) {
      for (const match of text.matchAll(INTERPOLATED_REF)) {
        const line = lineOf(text, match.index ?? 0);
        for (const role of ROLES)
          references.push({ name: `--color-${role}-${match[1]}`, file: posix, line, scope: scopeOf(posix) });
      }
    }
  }
  return { designTokens, componentTokens, references };
}

/**
 * A reference is a violation when it resolves to no definition AND it names a
 * Design Token — one whose family is owned by the foundations layer, or that is
 * consumed by more than one unit (a cross-cutting token cannot be any single
 * component's private knob). An unresolved reference confined to one unit and
 * outside every foundation family is a component token relying on its default.
 */
function findViolations({ designTokens, componentTokens, references }: Inventory): Reference[] {
  const defined = new Set([...designTokens, ...componentTokens]);
  const designFamilies = new Set([...designTokens].map(familyOf));

  const scopesByName = new Map<string, Set<string>>();
  for (const reference of references) {
    const scopes = scopesByName.get(reference.name) ?? new Set<string>();
    scopes.add(reference.scope);
    scopesByName.set(reference.name, scopes);
  }

  return references.filter((reference) => {
    if (defined.has(reference.name)) return false;
    const crossCutting = (scopesByName.get(reference.name)?.size ?? 0) > 1;
    return designFamilies.has(familyOf(reference.name)) || crossCutting;
  });
}

const format = (violations: Reference[]) =>
  violations.map((v) => `${v.name} — ${v.file}:${v.line}`).sort();

describe("design-system token references", () => {
  test("every Design Token reference resolves to a definition", () => {
    const found = inventory();
    // A clean result is trustworthy only if the scan actually saw the system.
    // Were parsing to collapse silently — a regressed regex, a broken path — zero
    // references would yield zero violations and the check would pass vacuously,
    // evaporating the net without a single failing test. Assert the inventory is
    // substantial before trusting it clean.
    expect(found.references.length).toBeGreaterThan(50);
    expect(found.designTokens.size).toBeGreaterThan(20);
    expect(found.componentTokens.size).toBeGreaterThan(0);
    expect(format(findViolations(found))).toEqual([]);
  });

  test("an undefined Design Token is flagged even behind a fallback", () => {
    const violations = findViolations({
      designTokens: new Set(["--color-primary-primary"]),
      componentTokens: new Set(),
      references: [
        { name: "--color-accent", file: "x/Widget.module.css", line: 1, scope: "components/Widget" },
      ],
    });
    expect(violations.map((v) => v.name)).toEqual(["--color-accent"]);
  });

  test("a component token relying on its fallback default is accepted", () => {
    const violations = findViolations({
      designTokens: new Set(["--color-primary-primary"]),
      componentTokens: new Set(),
      references: [
        { name: "--widget-gap", file: "x/Widget.module.css", line: 1, scope: "components/Widget" },
      ],
    });
    expect(violations).toEqual([]);
  });

  test("a renamed color-role token is caught through interpolation", () => {
    const violations = findViolations({
      designTokens: new Set(["--color-primary-primary", "--color-secondary-primary"]),
      componentTokens: new Set(),
      references: [
        { name: "--color-danger-primary", file: "x/Widget.tsx", line: 1, scope: "components/Widget" },
      ],
    });
    expect(violations.map((v) => v.name)).toEqual(["--color-danger-primary"]);
  });

  test("an undefined token consumed by multiple units is flagged as cross-cutting", () => {
    const violations = findViolations({
      designTokens: new Set(["--color-primary-primary"]),
      componentTokens: new Set(),
      references: [
        { name: "--layout-gap", file: "a/Button.module.css", line: 1, scope: "components/Button" },
        { name: "--layout-gap", file: "b/Input.module.css", line: 1, scope: "components/Input" },
      ],
    });
    expect(violations.map((v) => v.name)).toEqual(["--layout-gap", "--layout-gap"]);
  });
});
