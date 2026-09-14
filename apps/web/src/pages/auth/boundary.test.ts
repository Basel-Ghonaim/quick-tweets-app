import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

// Holds the auth page group to what ADR 0018 gives a page group.

const SRC = join(process.cwd(), "src");
const GROUP = join(SRC, "pages", "auth");
const ALIAS = "@pages/auth";

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

const specifiersIn = (source: string): string[] =>
  [...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1]);

const label = (file: string) => relative(SRC, file).split(sep).join("/");
const inGroup = (file: string) => file.startsWith(GROUP + sep);
const isSource = (file: string) => /\.tsx?$/.test(file);
const isStory = (file: string) => /\.stories\.tsx$/.test(file);
const isSelf = (s: string) => s === ALIAS || s.startsWith(ALIAS + "/");

const sources = filesUnder(SRC).filter(isSource);
const groupFiles = filesUnder(GROUP);

/** A page composes capabilities; it never reaches the wire itself, and the
 *  store is the composition root's to assemble. */
const FORBIDDEN = ["@shared/api", "@shared/rtk-query", "@app/"];

/** A capability is reached through its barrel, never past it. */
const PAST_A_BARREL = /^@(features|shared)\/[^/]+\/.+/;

describe("the auth page group's public surface", () => {
  test("a consumer reaches it only through the root barrel", () => {
    expect(sources.length).toBeGreaterThan(50);

    const violations = sources
      .filter((file) => !inGroup(file) && !isStory(file))
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => s.startsWith(ALIAS + "/"))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("it never imports itself through its own alias", () => {
    const violations = groupFiles
      .filter(isSource)
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter(isSelf)
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("the barrel offers the route subtree and nothing else", () => {
    const barrel = readFileSync(join(GROUP, "index.ts"), "utf8");
    const offered = [...barrel.matchAll(/export (?:type )?\{([^}]+)\}/g)].flatMap((m) =>
      m[1]
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    );

    expect(offered).toEqual(["authRoute"]);
  });
});

describe("what the page group holds", () => {
  // Story files are exempt from the zone direction (ADR 0018 Decision 9).
  test("no transport and no store: a page composes, and owns no fact", () => {
    expect(groupFiles.length).toBeGreaterThan(20);

    const violations = groupFiles
      .filter((file) => isSource(file) && !isStory(file))
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => FORBIDDEN.some((f) => s.startsWith(f)))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("every capability is reached through its barrel, never past it", () => {
    const violations = groupFiles
      .filter((file) => isSource(file) && !isStory(file))
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => PAST_A_BARREL.test(s) && !s.startsWith("@shared/design-system"))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });
});
