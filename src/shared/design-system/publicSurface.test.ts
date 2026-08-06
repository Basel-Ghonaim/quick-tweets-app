import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The layer has one public surface, and it holds in both directions.
 *
 * **Outward:** a consumer imports the root barrel and nothing deeper. Reaching
 * past it couples the consumer to how the layer is built, which is what leaves
 * the internals free to move — every restructure in this effort was cheap
 * because no consumer could see it.
 *
 * **Inward:** the layer never imports itself through its own public alias. Doing
 * so makes it a consumer of itself, and an alias that resolves through a barrel
 * can close a cycle that a relative path would have made obvious.
 */

const SRC = join(process.cwd(), "src");
const LAYER = join(SRC, "shared", "design-system");
const ALIAS = "@shared/design-system";

const sourcesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourcesUnder(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });

const importSpecifiers = (source: string): string[] =>
  [
    ...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g),
  ].map((match) => match[1]);

const label = (file: string) => relative(SRC, file).split(sep).join("/");

const sources = sourcesUnder(SRC);
const inLayer = (file: string) => file.startsWith(LAYER + sep);

describe("design system public surface", () => {
  test("a consumer reaches the layer only through its root barrel", () => {
    // Guard against a vacuous pass: no scan, no violations.
    expect(sources.length).toBeGreaterThan(50);

    const violations = sources
      .filter((file) => !inLayer(file))
      .flatMap((file) =>
        importSpecifiers(readFileSync(file, "utf8"))
          .filter((specifier) => specifier.startsWith(ALIAS + "/"))
          .map((specifier) => `${label(file)} — ${specifier}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("the layer does not import itself through its own alias", () => {
    const violations = sources
      .filter(inLayer)
      .flatMap((file) =>
        importSpecifiers(readFileSync(file, "utf8"))
          .filter((specifier) => specifier.startsWith(ALIAS))
          .map((specifier) => `${label(file)} — ${specifier}`),
      );

    expect(violations.sort()).toEqual([]);
  });
});
