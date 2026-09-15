import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The zone direction [ADR 0018](../../../docs/architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md)
 * Decision 1 fixes, enforced rather than reviewed.
 *
 * A capability's own fence holds the rules of that capability. This holds the
 * rule between them, which is the one no slice can police alone: thirteen of
 * fifteen `shared/` slices carry no fence, so until now nothing stopped a
 * platform mechanism importing a feature.
 */

const SRC = join(process.cwd(), "src");

/** A zone may reach the zones beneath it and never one above. */
const RANK = { app: 0, pages: 1, features: 2, shared: 3 } as const;
type Zone = keyof typeof RANK;

const ZONES = Object.keys(RANK) as Zone[];

/**
 * Import and re-export specifiers: with a `from` clause, as a bare side-effect
 * import, and dynamic. The side-effect form names no binding, so a pattern
 * expecting `from` is blind to it.
 */
const SPECIFIER =
  /(?:import|export)\s[^;'"]*?from\s*["']([^"']+)["']|\bimport\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/g;

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

const label = (file: string) => relative(SRC, file).split(sep).join("/");
const isSource = (file: string) => /\.tsx?$/.test(file);
const isStory = (file: string) => /\.stories\.tsx$/.test(file);

const specifiersIn = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(SPECIFIER)]
    .map((m) => m[1] ?? m[2] ?? m[3])
    .filter((s): s is string => Boolean(s));

/**
 * Where a specifier lands, as a label under `src` — or `null` when it leaves,
 * which a bare package and the test-support alias both do. Relative paths are
 * resolved rather than skipped: an alias-only rule is evaded by `../`, and
 * every capability fence in the tree has that blind spot today.
 */
const targetLabel = (spec: string, file: string): string | null => {
  const alias = spec.match(/^@(app|pages|features|shared)(\/.*)?$/);
  if (alias) return alias[1] + (alias[2] ?? "");

  if (!spec.startsWith(".")) return null;

  const abs = resolve(dirname(file), spec);
  return abs.startsWith(SRC + sep) ? label(abs) : null;
};

const zoneOf = (l: string): Zone | null => {
  const head = l.split("/")[0];
  return head in RANK ? (head as Zone) : null;
};

/** `app` is one slice; every other zone is divided into them. */
const sliceOf = (l: string): string => {
  const parts = l.split("/");
  return parts[0] === "app" ? "app" : `${parts[0]}/${parts[1]}`;
};

const sources = filesUnder(SRC).filter(isSource);

/** Every crossing a file makes into a zone, with the file that makes it. */
interface Crossing {
  file: string;
  spec: string;
  from: { zone: Zone; slice: string };
  to: { zone: Zone; slice: string };
  story: boolean;
}

const crossings: Crossing[] = sources.flatMap((file) => {
  const l = label(file);
  const from = zoneOf(l);
  // `main.tsx` and `docs/` sit in no zone: the direction is between zones, and
  // the entry point is what mounts the topmost one.
  if (!from) return [];

  return specifiersIn(file).flatMap((spec) => {
    const target = targetLabel(spec, file);
    const to = target === null ? null : zoneOf(target);
    if (target === null || to === null) return [];

    return [
      {
        file: l,
        spec,
        from: { zone: from, slice: sliceOf(l) },
        to: { zone: to, slice: sliceOf(target) },
        story: isStory(file),
      },
    ];
  });
});

const report = (c: Crossing) => `${c.file} — ${c.spec}`;

describe("the frontend zones", () => {
  test("the zones are discoverable, and this check found them", () => {
    // Guards the check itself: a rule that silently stops finding its subjects
    // passes forever. If `src` is ever restructured, this fails first.
    expect(ZONES.filter((z) => existsSync(join(SRC, z))).sort()).toEqual([...ZONES].sort());
    ZONES.forEach((z) => expect(statSync(join(SRC, z)).isDirectory()).toBe(true));

    expect(sources.length).toBeGreaterThan(300);
    expect(crossings.length).toBeGreaterThan(150);
  });

  test("a zone reaches the zones beneath it and never one above", () => {
    // Story files are exempt from the zone direction (ADR 0018 Decision 9).
    const violations = crossings
      .filter((c) => !c.story && RANK[c.to.zone] < RANK[c.from.zone])
      .map(report);

    expect(violations.sort()).toEqual([]);
  });

  test("a slice never reaches a sibling in its own zone", () => {
    // The sibling rule does not reach `shared/`: that zone is divided by
    // mechanism rather than by domain, so its parts compose one another freely
    // (ADR 0018 Decision 1, as revised). What bounds them is the direction
    // above, which the rule below cannot express and does not try to.
    const violations = crossings
      .filter(
        (c) =>
          !c.story &&
          c.from.zone === c.to.zone &&
          c.from.zone !== "shared" &&
          c.from.slice !== c.to.slice,
      )
      .map(report);

    expect(violations.sort()).toEqual([]);
  });

  /**
   * One of the two rules ADR 0018 Decision 4 gives a page, and the only one a
   * check can see: a page arranges capabilities and may not reach the wire
   * itself. Owning no state is the other, and no import expresses it — the
   * limitation is recorded rather than implied by a green run.
   *
   * Matched on the slice a specifier resolves to rather than on the text of
   * the specifier, so a relative path reaches the same verdict as an alias.
   */
  const TRANSPORT = ["shared/api", "shared/rtk-query"];

  test("a page composes, and never reaches the wire itself", () => {
    const violations = crossings
      .filter((c) => c.from.zone === "pages" && TRANSPORT.includes(c.to.slice))
      .map(report);

    expect(violations.sort()).toEqual([]);
  });

  /**
   * Test support lives outside `src` and is reached by an alias of its own, so
   * it belongs to no zone and the direction above says nothing about it. This
   * says the thing the direction cannot: production never imports it. Without
   * that, a stray import puts the interception library in the bundle, which is
   * the inverse of the rule the lanes were rebuilt to honour.
   */
  const isTestArtifact = (file: string) => /\.(test|spec)\.tsx?$|\.stories\.tsx$/.test(file);

  test("production never reaches the test support", () => {
    const production = sources.filter((file) => !isTestArtifact(file));
    expect(production.length).toBeGreaterThan(250);

    const violations = production.flatMap((file) =>
      specifiersIn(file)
        .filter((s) => s === "@testing" || s.startsWith("@testing/"))
        .map((s) => `${label(file)} — ${s}`),
    );

    expect(violations.sort()).toEqual([]);
  });
});
