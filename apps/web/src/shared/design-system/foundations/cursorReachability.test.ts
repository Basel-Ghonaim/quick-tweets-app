import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A declaration that can never render is worse than a missing one: it reads as
 * a decision. `cursor` on an element the same rule makes untargetable is the
 * case this layer actually shipped — the pointer never reaches the element, so
 * the cursor a user sees comes from whatever is behind it.
 *
 * It is a check rather than a convention because the convention was already
 * tried and lost. The pair was recorded against one control, and reproduced
 * into a second control built afterwards, with the record open the whole time.
 * A rule that has failed twice in the same way is what earns a check here.
 *
 * Scoped to the same rule, deliberately. A declaration can also be dead through
 * an *ancestor* that blocks the subtree, which is real and present in this
 * layer — but deciding it needs the cascade rather than the file, and a check
 * that guessed at ancestry would report where it could not know.
 */

const SRC = join(process.cwd(), "src");

const stylesheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

/** Blank comment bodies so a documented example is never read as a declaration. */
const stripComments = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

const RULE = /([^{}]*)\{([^{}]*)\}/g;
const UNTARGETABLE = /(^|[\s;])pointer-events\s*:\s*none/;
const CURSOR = /(^|[\s;])cursor\s*:/;

const lineOf = (text: string, index: number) =>
  text.slice(0, index).split("\n").length;

const unreachableIn = (file: string): string[] => {
  const css = stripComments(readFileSync(file, "utf8"));
  const label = relative(SRC, file).split(sep).join("/");

  return [...css.matchAll(RULE)]
    .filter(([, , body]) => UNTARGETABLE.test(body) && CURSOR.test(body))
    .map(
      (match) =>
        `${label}:${lineOf(css, match.index ?? 0)} — ${match[1].trim().split("\n").pop()?.trim()}`,
    );
};

const files = stylesheets(SRC);

describe("cursor reachability", () => {
  test("no rule declares a cursor on an element it also makes untargetable", () => {
    // A clean result is only trustworthy if the scan saw the stylesheets: an
    // empty list has no violations for the same reason a correct one does not.
    expect(files.length).toBeGreaterThan(10);

    expect(files.flatMap(unreachableIn).sort()).toEqual([]);
  });

  test("the pattern reports the pair, and spares each half alone", () => {
    const found = (css: string) =>
      [...css.matchAll(RULE)].filter(
        ([, , body]) => UNTARGETABLE.test(body) && CURSOR.test(body),
      );

    expect(found(".a { pointer-events: none; cursor: not-allowed; }")).toHaveLength(1);
    expect(found(".a { cursor: not-allowed; pointer-events: none; }")).toHaveLength(1);

    expect(found(".a { cursor: not-allowed; }")).toHaveLength(0);
    expect(found(".a { pointer-events: none; }")).toHaveLength(0);
    // `pointer-events: auto` re-enables the element, so a cursor there is live.
    expect(found(".a { pointer-events: auto; cursor: pointer; }")).toHaveLength(0);
  });
});
