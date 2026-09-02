import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A custom property cannot be used in a media query (Finding 0011), so the
 * layout's two widths are written out in every stylesheet that reacts to them.
 * A change to one and not the others tears the composition, and nothing about
 * the result says which value was meant.
 *
 * Screens are scanned too: a repeated value is only held by a check that sees
 * every place it is repeated. The current design predates these two widths.
 */

const MODULE = join(process.cwd(), "src/modules/auth");
const SCANNED = ["layout", "screens"].map((dir) => join(MODULE, dir));

/** Where the two columns stop, and where the compact set begins. */
const BREAKPOINTS = ["72rem", "36rem"];

const stylesheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

const QUERY = /@media\s*\(width\s*<=\s*([^)]+)\)/g;

const widthsIn = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(QUERY)].map((match) => match[1].trim());

const files = SCANNED.flatMap(stylesheets);
const label = (file: string) => relative(MODULE, file).split(sep).join("/");

describe("the auth layout's breakpoints", () => {
  test("every stylesheet reacts only to the two the layout has", () => {
    // A clean result is only trustworthy if the scan saw the queries.
    const found = files.flatMap(widthsIn);
    expect(found.length).toBeGreaterThan(3);

    const strays = files.flatMap((file) =>
      widthsIn(file)
        .filter((width) => !BREAKPOINTS.includes(width))
        .map((width) => `${label(file)} — ${width}`),
    );

    expect(strays.sort()).toEqual([]);
  });

  test("both are in use, so neither is a value nothing reacts to", () => {
    const found = new Set(files.flatMap(widthsIn));
    expect([...found].sort()).toEqual([...BREAKPOINTS].sort());
  });
});
