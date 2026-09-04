/**
 * I6 — nothing in this capability imports from Channel Verification.
 *
 * The two share a code/digest/compare pattern by construction, copied rather
 * than shared (ADR 0016 Decision 4). This asserts the copy stayed a copy: no
 * production file under this module reaches into `modules/channel-verification`
 * to borrow it back.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const productionFiles = () =>
  readdirSync(HERE)
    .filter((name) => name.startsWith("passwordReset.") && name.endsWith(".ts"))
    .filter((name) => !name.includes(".test."));

describe("no file in the password-reset capability imports Channel Verification", () => {
  for (const file of productionFiles()) {
    it(`${file} does not mention channel-verification`, () => {
      const source = readFileSync(path.join(HERE, file), "utf8");
      expect(source).not.toMatch(/channel-?verification/i);
    });
  }

  it("found at least one file to check — a guard that scans nothing proves nothing", () => {
    expect(productionFiles().length).toBeGreaterThan(0);
  });
});
