import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

// Holds journey to the capability structure (docs/frontend/architecture.md).

const SRC = join(process.cwd(), "src");
const CAPABILITY = join(SRC, "features", "journey");
const ALIAS = "@features/journey";

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

const FORBIDDEN = [
  "@features/",
  "@pages/",
  "@app/",
  "@shared/copy",
  "@shared/schema-form",
  "@shared/design-system",
  "@shared/routing",
  "react-router",
];

describe("the journey's public surface", () => {
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

  test("the barrel offers the hook and the types its consumers name, and nothing else", async () => {
    const barrel = await import("./index");
    const types = [
      ...readFileSync(join(CAPABILITY, "index.ts"), "utf8").matchAll(/export type \{([^}]+)\}/g),
    ].flatMap((m) => m[1].split(",").map((name) => name.trim()).filter(Boolean));

    expect(Object.keys(barrel).sort()).toEqual(["useJourney"]);
    expect(types.sort()).toEqual(
      [
        "JourneyMove",
        "JourneyPhase",
        "JourneyRead",
        "JourneyGateway",
        "JourneyState",
        "ProfileOutcome",
      ].sort(),
    );
  });
});

describe("what the journey holds", () => {
  test("no interface: no component, no stylesheet, no story", () => {
    expect(capabilityFiles.length).toBeGreaterThan(5);

    /* A test that mounts a hook is `.tsx` and is not an interface. It is the
       only `.tsx` this capability admits, and it must live here: a hook's
       double belongs to the capability that owns the dependency. */
    const ui = capabilityFiles
      .filter((f) => !f.endsWith(".component.test.tsx"))
      .filter((f) => /\.(tsx|module\.css|stories\.tsx)$/.test(f))
      .map(label);

    expect(ui).toEqual([]);
  });

  test("no other feature, no page, no root, no content, no form, no control, no route", () => {
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
