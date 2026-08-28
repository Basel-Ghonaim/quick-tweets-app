import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A transition names what changes. `all` names everything that ever varies,
 * including things the component never decided to animate — and in this layer
 * that included the owned focus indicator, which is composed onto seven roots
 * and so fell inside `all`'s scope. A keyboard user was waiting for the ring to
 * fade in because a shorthand was easier to write than a list.
 *
 * A check rather than a convention because the convention was tried. `all` was
 * recorded against one control in August and had reached ten sites across five
 * stylesheets by the time it was removed. Its cost is also invisible at the
 * point of writing: the author sees the states they meant, never the ones they
 * inherited.
 *
 * Scoped to the Design System, deliberately. A consumer composing its own page
 * may reasonably write a shorthand; what the layer owes its consumers is that
 * the indicator it guarantees behaves the same way everywhere.
 */

const LAYER = join(process.cwd(), "src/shared/design-system");

const stylesheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

/** Blank comment bodies so a documented example is never read as a declaration. */
const stripComments = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/** `transition: all …` and `transition-property: all`, in any spacing. */
const UNSCOPED = /(^|[\s;{])transition(-property)?\s*:\s*all\b/g;

const lineOf = (text: string, index: number) =>
  text.slice(0, index).split("\n").length;

const unscopedIn = (file: string): string[] => {
  const css = stripComments(readFileSync(file, "utf8"));
  const label = relative(join(process.cwd(), "src"), file).split(sep).join("/");

  return [...css.matchAll(UNSCOPED)].map(
    (match) => `${label}:${lineOf(css, match.index ?? 0)}`,
  );
};

const files = stylesheets(LAYER);

describe("transition scope", () => {
  test("no stylesheet in the layer transitions everything", () => {
    // A clean result is only trustworthy if the scan saw the stylesheets.
    expect(files.length).toBeGreaterThan(5);

    expect(files.flatMap(unscopedIn).sort()).toEqual([]);
  });

  test("the pattern reports the shorthand, and spares a named list", () => {
    const found = (css: string) => [...css.matchAll(UNSCOPED)];

    expect(found(".a { transition: all 0.2s; }")).toHaveLength(1);
    expect(found(".a { transition-property: all; }")).toHaveLength(1);
    expect(found(".a { transition:all var(--x); }")).toHaveLength(1);

    expect(found(".a { transition: opacity 0.2s; }")).toHaveLength(0);
    expect(found(".a { transition: background-color 0.2s, border-color 0.2s; }")).toHaveLength(0);
    // `all` inside another property's value is not a transition scope.
    expect(found(".a { grid-template-columns: repeat(all, 1fr); }")).toHaveLength(0);
  });
});
