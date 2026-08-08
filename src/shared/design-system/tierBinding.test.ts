import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

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
 * The exception is stated by definition file rather than by name. Border radius
 * and width carry their tier on the curated scale itself, so a component binding
 * those is already correct.
 */

const LAYER = join(process.cwd(), "src/shared/design-system");
const FOUNDATIONS = join(LAYER, "foundations");

/** Primitive files whose tokens *are* the tier their family carries. */
const TIER_BEARING_PRIMITIVES = ["border.css"];

/**
 * Surfaces still awaiting migration. An entry must still be in violation, so a
 * component that migrates cannot leave its own exemption behind.
 */
const PENDING = ["components/fields/FileInput"];

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

const label = (file: string) => relative(LAYER, file).split(sep).join("/");

const offLimits = new Set([
  ...declaredIn(
    filesUnder(join(FOUNDATIONS, "tokens/primitive"), /\.css$/).filter(
      (file) => !TIER_BEARING_PRIMITIVES.some((name) => file.endsWith(name)),
    ),
  ),
  ...declaredIn(filesUnder(join(FOUNDATIONS, "legacy"), /\.css$/)),
]);

const consumers = [
  ...filesUnder(join(LAYER, "components"), /\.(css|tsx)$/),
  ...filesUnder(join(LAYER, "icons"), /\.(css|tsx)$/),
].filter((file) => !/\.(test|stories)\.tsx$/.test(file));

const violationsIn = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(/var\(\s*(--[a-z0-9-]+)/g)]
    .map((m) => m[1])
    .filter((name) => offLimits.has(name))
    .map((name) => `${label(file)} — ${name}`);

const isPending = (file: string) =>
  PENDING.some((prefix) => label(file).startsWith(prefix));

describe("component tier binding", () => {
  test("a migrated component reaches for no primitive or superseded token", () => {
    // A clean result is only trustworthy if the scan saw the layer.
    expect(offLimits.size).toBeGreaterThan(20);
    expect(consumers.length).toBeGreaterThan(20);

    const violations = consumers
      .filter((file) => !isPending(file))
      .flatMap(violationsIn);

    expect([...new Set(violations)].sort()).toEqual([]);
  });

  test("every pending surface is still pending", () => {
    const stillViolating = PENDING.filter((prefix) =>
      consumers
        .filter((file) => label(file).startsWith(prefix))
        .some((file) => violationsIn(file).length > 0),
    );

    expect(stillViolating.sort()).toEqual([...PENDING].sort());
  });
});
