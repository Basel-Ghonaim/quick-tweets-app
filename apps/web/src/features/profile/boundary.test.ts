import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Profile publishes a hook and nothing else: it is written where the journey
 * needs it, and stays self-contained so the move to a Users capability is a
 * directory move. Each fence here is a rule the structure states.
 */

const SRC = join(process.cwd(), "src");
const CAPABILITY = join(SRC, "features", "profile");
const ALIAS = "@features/profile";

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

const specifiersIn = (source: string): string[] =>
  [...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1]);

const label = (file: string) => relative(SRC, file).split(sep).join("/");
const inCapability = (file: string) => file.startsWith(CAPABILITY + sep);
const isSource = (file: string) => /\.tsx?$/.test(file);
const isSelf = (specifier: string) => specifier === ALIAS || specifier.startsWith(ALIAS + "/");

const sources = filesUnder(SRC).filter(isSource);
const capabilityFiles = filesUnder(CAPABILITY);

/** What a feature may not know: another feature, the legacy zone, the root. */
const FORBIDDEN = ["@features/", "@modules/", "@app/"];

describe("profile's public surface", () => {
  test("a consumer reaches it only through the root barrel", () => {
    expect(sources.length).toBeGreaterThan(50);

    const violations = sources
      .filter((file) => !inCapability(file))
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => s.startsWith(ALIAS + "/"))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("it never imports itself through its own alias", () => {
    const violations = sources
      .filter(inCapability)
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter(isSelf)
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("the barrel offers the hook and its port, and nothing else", () => {
    const barrel = readFileSync(join(CAPABILITY, "index.ts"), "utf8");
    const offered = [...barrel.matchAll(/export (?:type )?\{([^}]+)\}/g)].flatMap((m) =>
      m[1]
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    );

    expect(offered.sort()).toEqual(["ProfileGateway", "useProfileFlow"]);
  });
});

describe("what profile holds", () => {
  test("no interface: no component, no stylesheet, no story", () => {
    expect(capabilityFiles.length).toBeGreaterThan(15);

    const ui = capabilityFiles.filter((f) => /\.(tsx|module\.css|stories\.tsx)$/.test(f)).map(label);

    expect(ui).toEqual([]);
  });

  test("no other feature, no legacy zone, no root", () => {
    const violations = capabilityFiles
      .filter(isSource)
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => !isSelf(s) && FORBIDDEN.some((f) => s.startsWith(f)))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });
});
