import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The layer is closed: it imports nothing from outside itself — not a feature,
 * not a page, not the application, and not a sibling in `shared/` either. Its
 * boundary is export-only, and the reason is the layer README's.
 *
 * This is the half of that boundary `publicSurface` does not watch. That check
 * asks who reaches *in*; nothing asked what the layer reaches *out* for, so a
 * single import to a sibling mechanism would have passed every gate here.
 *
 * **Stories are outside the closure**, on the exemption ADR 0018 Decision 9
 * already grants them and for the same reason: a story renders a thing in the
 * composition a reader actually meets, so it stands in for a consumer rather
 * than for the layer. A consumer of this layer supplies the words, which is
 * exactly what `FileInput`'s stories reach for the localisation mechanism to do.
 * The exemption is bounded the same way — rendering and evidence — and
 * production code, tests included, is closed.
 *
 * Package imports are not the subject: `react` is a dependency of the workspace,
 * not a file this layer would be carrying with it.
 */

const SRC = join(process.cwd(), "src");
const LAYER = join(SRC, "shared", "design-system");

/** The workspace's own zones. Reaching any of them leaves the layer. */
const PROJECT_ALIAS = /^@(app|pages|features|shared)(\/|$)/;

const sourcesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourcesUnder(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });

const importSpecifiers = (source: string): string[] =>
  [...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1]);

const label = (file: string) => relative(SRC, file).split(sep).join("/");

const isStory = (file: string) => file.endsWith(".stories.tsx");

/** A relative specifier that resolves outside the layer's own directory. */
const escapes = (file: string, specifier: string) =>
  specifier.startsWith(".") &&
  !resolve(file, "..", specifier).startsWith(LAYER + sep);

describe("design system closure", () => {
  test("the layer imports nothing from outside itself", () => {
    const closed = sourcesUnder(LAYER).filter((file) => !isStory(file));

    // A clean result is only trustworthy if the scan saw the layer.
    expect(closed.length).toBeGreaterThan(40);

    const violations = closed.flatMap((file) =>
      importSpecifiers(readFileSync(file, "utf8"))
        .filter(
          (specifier) =>
            PROJECT_ALIAS.test(specifier) || escapes(file, specifier),
        )
        .map((specifier) => `${label(file)} — ${specifier}`),
    );

    expect(violations.sort()).toEqual([]);
  });

  test("the exemption is bounded to stories, and reaches no further", () => {
    // Stated as a positive: were the exemption widened to every file, the one
    // import that uses it would stop being visible here.
    const exempt = sourcesUnder(LAYER).filter(isStory);

    const reachingOut = exempt.flatMap((file) =>
      importSpecifiers(readFileSync(file, "utf8"))
        .filter((specifier) => PROJECT_ALIAS.test(specifier))
        .map((specifier) => `${label(file)} — ${specifier}`),
    );

    // Not a limit on stories, which the exemption permits: a record of what
    // currently uses it, so widening it is a decision rather than a drift.
    expect(reachingOut.sort()).toEqual([
      "shared/design-system/components/fields/FileInput/FileInput.stories.tsx — @shared/localisation",
    ]);
  });
});
