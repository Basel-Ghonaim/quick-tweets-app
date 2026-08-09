import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

import { ROLES } from "./foundations/vocabulary";

/**
 * A component binds at the tier its family carries (ADR 0010 Decision 3): it
 * reaches for the semantic and intent tiers and never for a primitive scale or
 * the superseded set.
 *
 * The token checker proves a reference *resolves*, which a legacy or primitive
 * reference does — so it cannot see the tier a reference resolved to, and three
 * component migrations enforced this rule by reading the diff. It is also what
 * makes the superseded set safe to delete: nothing may still point at it.
 *
 * The exceptions are stated by definition file rather than by name. Border and
 * spacing are *curated scales*, and a component composing its own internal layout
 * binds them directly — that is what a curated scale is for. Palette, typography
 * and the transition scale are raw, and must reach a component through an intent.
 *
 * Which of the two a spacing reference should have been is a review judgement the
 * checker cannot make: it resolves references and cannot see whether a bound token
 * is a scale position or an intent (I1).
 *
 * Interpolated names are expanded before matching. A component builds a role
 * reference by interpolation, and a pattern that stops at the `$` reads
 * `--color-${role}-primary` as `--color-` and matches nothing — which is how two
 * FileInput variants kept injecting superseded tokens through a migration.
 *
 * The two halves are scoped differently, because they answer to different owners.
 * **The superseded set is banned everywhere in `src/`**: it is what makes deleting
 * that set provably safe, and a consumer holding one reference is enough to block
 * it. **The primitive tier rule applies to the Design System layer only**: a
 * consumer legitimately composes with the curated scales, and with the type scale
 * where the language deliberately authors no role.
 */

const SRC = join(process.cwd(), "src");
const LAYER = join(SRC, "shared", "design-system");
const FOUNDATIONS = join(LAYER, "foundations");

/** Curated scales a component may bind directly. */
const TIER_BEARING_PRIMITIVES = ["border.css", "spacing.css"];

/**
 * Surfaces still awaiting migration, as `src/`-relative path prefixes. Empty now;
 * the guard below is what keeps it that way — an entry must still be in violation,
 * so a surface that migrates cannot leave its own exemption behind.
 */
const PENDING: string[] = [];

const filesUnder = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full, match);
    return match.test(entry.name) ? [full] : [];
  });

const declaredIn = (files: string[]): Set<string> =>
  new Set(
    files.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map(
        (m) => m[1],
      ),
    ),
  );

const label = (file: string) => relative(SRC, file).split(sep).join("/");

const superseded = declaredIn(filesUnder(join(FOUNDATIONS, "legacy"), /\.css$/));

const rawPrimitives = declaredIn(
  filesUnder(join(FOUNDATIONS, "tokens/primitive"), /\.css$/).filter(
    (file) => !TIER_BEARING_PRIMITIVES.some((name) => file.endsWith(name)),
  ),
);

const sources = (root: string) =>
  filesUnder(root, /\.(css|tsx)$/).filter(
    (file) => !/\.(test|stories)\.tsx$/.test(file),
  );

/** Everything that could hold a reference — the layer and its consumers alike. */
const everything = sources(SRC).filter(
  (file) => !file.startsWith(join(FOUNDATIONS) + sep),
);

const layerComponents = [
  ...sources(join(LAYER, "components")),
  ...sources(join(LAYER, "icons")),
];

const expand = (name: string): string[] =>
  name.includes("${")
    ? ROLES.map((role) => name.replace(/\$\{[^}]*\}/g, role))
    : [name];

const referencesIn = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(/var\(\s*(--[^),\s]+)/g)].flatMap((m) =>
    expand(m[1]),
  );

const violationsIn = (file: string, banned: Set<string>): string[] =>
  referencesIn(file)
    .filter((name) => banned.has(name))
    .map((name) => `${label(file)} — ${name}`);

const isPending = (file: string) =>
  PENDING.some((prefix) => label(file).startsWith(prefix));

describe("tier binding", () => {
  test("nothing anywhere references the superseded set", () => {
    // A clean result is only trustworthy if the scan saw the tree.
    expect(superseded.size).toBeGreaterThan(20);
    expect(everything.length).toBeGreaterThan(40);

    const violations = everything.flatMap((file) =>
      violationsIn(file, superseded),
    );

    expect([...new Set(violations)].sort()).toEqual([]);
  });

  test("a component reaches for no raw primitive", () => {
    expect(rawPrimitives.size).toBeGreaterThan(10);
    expect(layerComponents.length).toBeGreaterThan(20);

    const violations = layerComponents
      .filter((file) => !isPending(file))
      .flatMap((file) => violationsIn(file, rawPrimitives));

    expect([...new Set(violations)].sort()).toEqual([]);
  });

  test("every pending surface is still pending", () => {
    const stillViolating = PENDING.filter((prefix) =>
      layerComponents
        .filter((file) => label(file).startsWith(prefix))
        .some((file) => violationsIn(file, rawPrimitives).length > 0),
    );

    expect(stillViolating.sort()).toEqual([...PENDING].sort());
  });
});
