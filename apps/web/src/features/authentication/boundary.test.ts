import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

// Holds authentication to the capability structure (docs/frontend/architecture.md).

const SRC = join(process.cwd(), "src");
const CAPABILITY = join(SRC, "features", "authentication");
const SCREENS = join(CAPABILITY, "screens");
const ALIAS = "@features/authentication";

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
const isStory = (file: string) => /\.stories\.tsx$/.test(file);
const isSelf = (specifier: string) => specifier === ALIAS || specifier.startsWith(ALIAS + "/");

const sources = filesUnder(SRC).filter(isSource);
const capabilityFiles = filesUnder(CAPABILITY);

/** What a feature may not know: another feature, a page, the root. */
const FORBIDDEN = ["@features/", "@pages/", "@app/"];

/** The layers a screen reaches through its hooks rather than itself. */
const BENEATH_THE_SCREENS = /(^|\/)(forms|services)$/;

describe("authentication's public surface", () => {
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

  test("the barrel offers the two screens, the wording and the slice", () => {
    const barrel = readFileSync(join(CAPABILITY, "index.ts"), "utf8");
    const offered = [...barrel.matchAll(/export (?:type )?\{([^}]+)\}/g)].flatMap((m) =>
      m[1]
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    );

    expect(offered.sort()).toEqual(
      [
        "SignIn",
        "SignUp",
        "authErrorHandler",
        "authenticationReducer",
        "authenticationActions",
      ].sort(),
    );
  });
});

describe("what authentication holds", () => {
  // Story files are exempt from the zone direction (ADR 0018 Decision 9).
  test("no other feature, no page, no root", () => {
    expect(capabilityFiles.length).toBeGreaterThan(20);

    const violations = capabilityFiles
      .filter((file) => isSource(file) && !isStory(file))
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => !isSelf(s) && FORBIDDEN.some((f) => s.startsWith(f)))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("a screen reaches neither the forms nor the services", () => {
    const screens = capabilityFiles.filter(
      (file) => isSource(file) && file.startsWith(SCREENS + sep),
    );
    expect(screens.length).toBeGreaterThan(5);

    const violations = screens.flatMap((file) =>
      specifiersIn(readFileSync(file, "utf8"))
        .filter((s) => BENEATH_THE_SCREENS.test(s))
        .map((s) => `${label(file)} — ${s}`),
    );

    expect(violations.sort()).toEqual([]);
  });
});
