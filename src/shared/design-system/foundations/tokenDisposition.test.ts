import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Every token family states what it is.
 *
 * Deliberately **not** a consumer check. A family with nobody using it may be
 * perfectly good curated vocabulary; what is not acceptable is a family whose
 * status nobody has decided. Three of them sat unconsumed and undecided long
 * enough that a Work Item was planned around the assumption that unconsumed means
 * unfinished — the ambiguity, not the absence, is what caused the wrong work.
 *
 * It checks that a disposition is *declared* and agrees with where the file sits.
 * Whether the disposition is architecturally *right* is a review judgement, the
 * same place I1 leaves the tier question.
 */

const FOUNDATIONS = join(process.cwd(), "src/shared/design-system/foundations");
const LEGACY = join(FOUNDATIONS, "legacy");

const STATES = ["active", "superseded", "intentionally-unconsumed"] as const;

const stylesheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

const label = (file: string) =>
  relative(FOUNDATIONS, file).split(sep).join("/");

const declaredIn = (file: string): string | undefined =>
  /\/\*\s*Disposition:\s*([a-z-]+)/.exec(readFileSync(file, "utf8"))?.[1];

const families = [
  ...stylesheets(join(FOUNDATIONS, "tokens")),
  ...stylesheets(LEGACY),
];

describe("token family disposition", () => {
  test("every family declares one, from the closed set", () => {
    // A clean result is only trustworthy if the scan saw the families.
    expect(families.length).toBeGreaterThan(5);

    const undeclared = families
      .filter((file) => {
        const state = declaredIn(file);
        return !state || !STATES.includes(state as (typeof STATES)[number]);
      })
      .map((file) => `${label(file)} — ${declaredIn(file) ?? "none"}`);

    expect(undeclared.sort()).toEqual([]);
  });

  test("the declaration agrees with where the file sits", () => {
    const disagreements = families
      .filter((file) => {
        const superseded = declaredIn(file) === "superseded";
        return superseded !== file.startsWith(LEGACY + sep);
      })
      .map((file) => `${label(file)} — ${declaredIn(file)}`);

    expect(disagreements.sort()).toEqual([]);
  });
});
