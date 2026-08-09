import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The focus indicator is owned, and owned means singular (ADR 0010 Decision 5).
 * No stylesheet outside the composable may declare one.
 *
 * Four components had grown their own before the migrations — each a slightly
 * different ring, one of them invisible — because "compose the shared one" was a
 * convention rather than a constraint. A component that suppresses `outline` and
 * draws a focus-state `box-shadow` is declaring an indicator whatever it calls it,
 * so both forms are caught.
 *
 * No exemption list, deliberately: one would erode the invariant it exists to
 * protect, and the migrations left nothing that needs one.
 */

const SRC = join(process.cwd(), "src");
const COMPOSABLE = join(
  SRC,
  "shared/design-system/foundations/composition/focusRing.module.css",
);

const stylesheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

const label = (file: string) => relative(SRC, file).split(sep).join("/");

/** Blank comment bodies so a documented example is never read as a declaration. */
const stripComments = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/** A rule that both keys off focus and paints a ring is an indicator. */
const RULE = /([^{}]*)\{([^{}]*)\}/g;

const indicatorsIn = (file: string): string[] => {
  const css = stripComments(readFileSync(file, "utf8"));
  return [...css.matchAll(RULE)]
    .filter(([, selector, body]) => {
      if (!/:focus(-visible|-within)?\b/.test(selector)) return false;
      return /(^|[\s;])(outline|box-shadow)\s*:/.test(body);
    })
    .map(([, selector]) => `${label(file)} — ${selector.trim()}`);
};

const candidates = stylesheets(SRC).filter((file) => file !== COMPOSABLE);

describe("owned focus indicator", () => {
  test("no stylesheet outside the composable declares one", () => {
    // A clean result is only trustworthy if the scan saw the stylesheets.
    expect(candidates.length).toBeGreaterThan(10);

    expect(candidates.flatMap(indicatorsIn).sort()).toEqual([]);
  });

  test("the composable itself still declares one", () => {
    expect(indicatorsIn(COMPOSABLE).length).toBeGreaterThan(0);
  });
});
