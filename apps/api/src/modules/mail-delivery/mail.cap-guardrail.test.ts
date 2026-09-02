/**
 * The abuse controls cover every backend, and that is asserted here rather than
 * left to review.
 *
 * The guarantee is structural: the barrel wraps whatever the registry returns,
 * and nothing outside the module can reach a backend to bypass the wrap. Both
 * halves are load-bearing — publishing one backend, or building an adapter
 * beside the barrel, would leave a path to a transport that no control sees, and
 * the first place that path would be exercised is production.
 *
 * Comments are stripped before scanning, as they are for the port's guardrail:
 * the guarantee lives in the code, and a guard that also policed prose would
 * sooner or later be weakened to allow a sentence.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_SRC = path.resolve(HERE, "..", "..");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");

const BARREL = stripComments(readFileSync(path.join(HERE, "index.ts"), "utf8"));

/** The factory's body: from its declaration to the next top-level export. */
const publishedFactory = (() => {
  const start = BARREL.indexOf("export const createMailAdapter");
  const rest = BARREL.slice(start);
  const end = rest.indexOf("\nexport ", 1);
  return end === -1 ? rest : rest.slice(0, end);
})();

const BACKEND_MODULES = ["inert.adapter", "capture.adapter", "smtp.adapter", "capped.adapter"];

/** Every TypeScript file in the API outside this module. */
const filesOutsideTheModule = (): string[] =>
  readdirSync(API_SRC, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
    .map((entry) => path.join(API_SRC, entry))
    .filter((file) => !file.startsWith(HERE) && !file.includes(`${path.sep}generated${path.sep}`));

describe("no backend reaches a caller without the abuse controls", () => {
  it("the adapter the barrel publishes is a capped one", () => {
    // The wrap must be what the factory *returns*, not merely something it
    // mentions: a backend returned ahead of the wrap would satisfy a presence
    // check while reaching a transport uncontrolled.
    expect(publishedFactory).toMatch(/=>\s*createCappedMailAdapter\(/);
  });

  for (const backend of [
    "createInertMailAdapter",
    "createCaptureMailAdapter",
    "createSmtpMailAdapter",
  ]) {
    it(`never publishes ${backend}, which could then be taken unwrapped`, () => {
      expect(BARREL).not.toMatch(new RegExp(`export[^\\n]*${backend}`));
    });
  }

  it("no file outside the module imports a backend directly", () => {
    const offenders = filesOutsideTheModule().filter((file) => {
      const source = readFileSync(file, "utf8");
      return BACKEND_MODULES.some((module) => source.includes(`${module}.js`));
    });

    expect(offenders).toEqual([]);
  });
});
