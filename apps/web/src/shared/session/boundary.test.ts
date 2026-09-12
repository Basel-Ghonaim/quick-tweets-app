import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";
import { initialSessionState } from "./store";

/**
 * The session is platform (ADR 0019) and holds the fact of a session and
 * nothing else. Each fence here is a rule its decision states; a rule with no
 * check erodes.
 */

const SRC = join(process.cwd(), "src");
const LAYER = join(SRC, "shared", "session");
const ALIAS = "@shared/session";

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

const specifiersIn = (source: string): string[] =>
  [...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1]);

const label = (file: string) => relative(SRC, file).split(sep).join("/");
const inLayer = (file: string) => file.startsWith(LAYER + sep);
const isSource = (file: string) => /\.tsx?$/.test(file);

const sources = filesUnder(SRC).filter(isSource);
const layerFiles = filesUnder(LAYER);

/** What the platform may not know: a feature, a page, the root, content, forms, controls, routing. */
const FORBIDDEN = [
  "@features/",
  "@modules/",
  "@app/",
  "@shared/copy",
  "@shared/schema-form",
  "@shared/design-system",
  "@shared/routing",
  "react-router",
];

describe("the session's public surface", () => {
  test("a consumer reaches it only through the root barrel", () => {
    expect(sources.length).toBeGreaterThan(50);

    const violations = sources
      .filter((file) => !inLayer(file))
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => s.startsWith(ALIAS + "/"))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("it never imports itself through its own alias", () => {
    const violations = sources
      .filter(inLayer)
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => s.startsWith(ALIAS))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("the barrel exports exactly the surface the decision names", async () => {
    const barrel = await import("./index");

    expect(Object.keys(barrel).sort()).toEqual(
      [
        "SESSION_SLICE_KEY",
        "sessionReducer",
        "sessionActions",
        "selectAccessToken",
        "selectSessionUser",
        "selectSessionStatus",
        "selectSignOutRequest",
        "useSession",
        "useSessionRestore",
        "useSignOut",
        "executeSignOut",
        "refreshSession",
        "toAuthResponse",
      ].sort(),
    );
  });
});

describe("what the session holds", () => {
  test("no interface: no component, no stylesheet, no story", () => {
    expect(layerFiles.length).toBeGreaterThan(10);

    const ui = layerFiles.filter((f) => /\.(tsx|module\.css|stories\.tsx)$/.test(f)).map(label);

    expect(ui).toEqual([]);
  });

  test("no feature, no page, no root, no content, no form, no control, no route", () => {
    const violations = layerFiles
      .filter(isSource)
      .flatMap((file) =>
        specifiersIn(readFileSync(file, "utf8"))
          .filter((s) => FORBIDDEN.some((f) => s.startsWith(f)))
          .map((s) => `${label(file)} — ${s}`),
      );

    expect(violations.sort()).toEqual([]);
  });

  test("the slice holds the fact and the sign-out's state, and nothing else", () => {
    expect(Object.keys(initialSessionState).sort()).toEqual(
      ["user", "accessToken", "status", "requests"].sort(),
    );
    expect(Object.keys(initialSessionState.requests)).toEqual(["signOut"]);
  });
});
