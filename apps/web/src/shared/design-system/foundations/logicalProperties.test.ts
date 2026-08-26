import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Direction-agnostic authoring, enforced rather than trusted (ADR 0010
 * Decision 6). A physical property does not mirror: `margin-left` stays on the
 * left when the document turns around, so one of them is all it takes for a
 * right-to-left reader to meet a layout that half-turned.
 *
 * It is a check rather than a convention because of when the cost lands. The
 * ADR chose logical properties on the ground that they are free while writing
 * and prohibitively expensive to retrofit — which means the moment the habit
 * lapses is invisible, and the bill arrives much later against every stylesheet
 * at once. There was exactly one physical property in the tree when this was
 * written; a check is what keeps that number from drifting upward unobserved.
 *
 * No exemption list, deliberately — the same reasoning the owned focus
 * indicator's check states. A treatment that genuinely must not mirror is rare
 * enough to earn its reason written at the value, and an exemption here would
 * erode the invariant it exists to protect.
 */

const SRC = join(process.cwd(), "src");

/**
 * Properties with a logical equivalent, so a match is always a choice that
 * could have been written another way:
 *   margin/padding/border-left|right   -> -inline-start | -inline-end
 *   left:/right: offsets               -> inset-inline-start | inset-inline-end
 *   text-align: left|right             -> start | end
 *   float: left|right                  -> inline-start | inline-end
 * `border-radius`, `background-position` and transforms are untouched: none of
 * them names a side that a direction change is supposed to swap.
 */
const PHYSICAL =
  /(?:^|[\s;{])((?:margin|padding|border)-(?:left|right)(?:-[\w-]+)?|(?:left|right)|text-align|float)\s*:\s*([^;{}]*)/g;

const isViolation = (property: string, value: string): boolean => {
  if (property === "text-align" || property === "float")
    return /^\s*(left|right)\b/.test(value);
  return true;
};

const stripComments = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "));

const stylesheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

const lineOf = (text: string, index: number) =>
  text.slice(0, index).split("\n").length;

function physicalIn(file: string): string[] {
  const css = stripComments(readFileSync(file, "utf8"));
  const label = relative(SRC, file).split(sep).join("/");

  return [...css.matchAll(PHYSICAL)]
    .filter(([, property, value]) => isViolation(property, value))
    .map(
      (match) =>
        `${label}:${lineOf(css, match.index ?? 0)} — ${match[1]}`,
    );
}

const files = stylesheets(SRC);

describe("direction-agnostic authoring", () => {
  test("no stylesheet uses a property that will not mirror", () => {
    // A clean result is only trustworthy if the scan saw the stylesheets: an
    // empty list has no violations for the same reason a correct one does not.
    expect(files.length).toBeGreaterThan(10);

    expect(files.flatMap(physicalIn).sort()).toEqual([]);
  });

  test("the pattern reports a physical property, and spares its logical twin", () => {
    const found = (css: string) =>
      [...css.matchAll(PHYSICAL)].filter(([, p, v]) => isViolation(p, v));

    expect(found(".a { margin-left: 4px; }")).toHaveLength(1);
    expect(found(".a { text-align: right; }")).toHaveLength(1);
    expect(found(".a { right: 0; }")).toHaveLength(1);

    expect(found(".a { margin-inline-start: 4px; }")).toHaveLength(0);
    expect(found(".a { text-align: start; }")).toHaveLength(0);
    expect(found(".a { inset-inline-end: 0; }")).toHaveLength(0);
    expect(found(".a { border-radius: 4px; }")).toHaveLength(0);
  });
});
