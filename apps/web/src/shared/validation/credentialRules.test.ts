import { describe, it, expect } from "vitest";
import { matchesPattern } from "@shared/schema-form";
import { newPasswordPolicy, usernameRules } from "./credentialRules";
import { VALIDATION_MESSAGES } from "@shared/copy";

// The API's auth.validator.test.ts carries these same tables, and its outcomes
// are the ones both tiers answer to: the server decides, this tier mirrors it.
const PASSWORD_CASES: ReadonlyArray<readonly [string, string, boolean]> = [
  ["plain ASCII", "Passw0rd!", true],
  ["an inner space", "Pass w0rd!", true],
  ["outer spaces", " Passw0rd! ", true],
  ["ASCII symbols at the range edges", "Passw0rd!~`^", true],
  ["Arabic letters", "Passw0rd!\u0643\u0644\u0645\u0629", false],
  ["an Arabic-Indic digit", "Passw0rd!\u0663", false],
  ["an accented Latin letter", "P\u00E4ssw0rd!", false],
  ["Cyrillic letters", "Passw0rd!\u043F\u0430\u0440", false],
  ["an emoji", "Passw0rd!\u{1F600}", false],
  ["a tab", "Passw0rd!\t", false],
  ["a no-break space", "Passw0rd!\u00A0", false],
  ["a right-to-left mark", "Passw0rd!\u200F", false],
  ["a delete control", "Passw0rd!\u007F", false],
];

/** Names each case by its outcome, never by its value, which may be invisible. */
const titled = (cases: ReadonlyArray<readonly [string, string, boolean]>) =>
  cases.map(([label, value, accepted]) => [`${label} is ${accepted ? "accepted" : "refused"}`, value, accepted] as const);

describe("new password character rule — printable ASCII only", () => {
  const validate = matchesPattern(newPasswordPolicy.characters, VALIDATION_MESSAGES.passwordCharacters);

  it.each(titled(PASSWORD_CASES))("%s", (_title, password, accepted) => {
    expect(validate(password, {})).toBe(accepted ? null : VALIDATION_MESSAGES.passwordCharacters);
  });
});

// Exercises the exact validator the register form composes —
// matchesPattern(usernameRules.charset, message) — so this proves the field's
// behaviour rather than a bare regex constant.
describe("username charset rule — lowercase-only", () => {
  const validate = matchesPattern(usernameRules.charset, VALIDATION_MESSAGES.usernameCharset);

  it("accepts lowercase letters, digits, and underscores", () => {
    for (const u of ["basel_a", "user_123", "abcd", "a_b_c_9"]) {
      expect(validate(u, {})).toBeNull();
    }
  });

  it("rejects any uppercase letter (no silent normalization)", () => {
    for (const u of ["Basel_A", "USER", "aBc1", "basel_A"]) {
      expect(validate(u, {})).toBe(VALIDATION_MESSAGES.usernameCharset);
    }
  });

  it("the charset message names the lowercase constraint", () => {
    expect(VALIDATION_MESSAGES.usernameCharset.toLowerCase()).toContain("lowercase");
  });
});
