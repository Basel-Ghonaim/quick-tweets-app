/**
 * A port's boundary erodes one helpful field at a time, so its ignorance of any
 * consumer's domain is asserted here rather than left to review.
 *
 * Comments are stripped before scanning: the boundary lives in the type surface,
 * and a guard that also policed prose would sooner or later be weakened to allow
 * a sentence.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");

const PORT_SURFACE = stripComments(
  readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "mail.types.ts"),
    "utf8",
  ),
).toLowerCase();

describe("the mail port's type surface carries no consumer-domain vocabulary", () => {
  for (const word of ["challenge", "verif", "code", "otp", "proof"]) {
    it(`never mentions "${word}"`, () => {
      expect(PORT_SURFACE).not.toContain(word);
    });
  }
});
