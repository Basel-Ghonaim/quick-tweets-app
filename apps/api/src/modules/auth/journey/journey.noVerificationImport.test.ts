/**
 * Nothing in this capability imports Channel Verification.
 *
 * The journey needs one fact that subsystem owns — whether a live challenge
 * exists — and takes it as a probe supplied at composition rather than by
 * reaching for it. This asserts the arrangement held: no production file here
 * names the subsystem, so the dependency stays in the composition root where it
 * can be seen, instead of spreading through the capability where it could not.
 *
 * The same guard password reset carries, for the same reason.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const productionFiles = () =>
  readdirSync(HERE)
    .filter((name) => name.startsWith("journey.") && name.endsWith(".ts"))
    .filter((name) => !name.includes(".test."));

describe("no file in the onboarding journey imports Channel Verification", () => {
  for (const file of productionFiles()) {
    it(`${file} does not mention channel-verification`, () => {
      const source = readFileSync(path.join(HERE, file), "utf8");

      expect(source).not.toMatch(/from\s+["'][^"']*channel-?verification/i);
    });
  }

  it("found at least one file to check — a guard that scans nothing proves nothing", () => {
    expect(productionFiles().length).toBeGreaterThan(0);
  });
});
