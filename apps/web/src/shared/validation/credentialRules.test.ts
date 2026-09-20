import { describe, it, expect } from "vitest";
import { matchesPattern } from "@shared/schema-form";
import { emailRules, newPasswordPolicy, usernameRules } from "./credentialRules";
import { CATALOGUES } from "@shared/copy";

const ENGLISH = CATALOGUES.en;

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

const EMAIL_CASES: ReadonlyArray<readonly [string, string, boolean]> = [
  ["a plain address", "user@example.com", true],
  ["dots, a plus tag and a subdomain", "first.last+tag@sub.example.co", true],
  ["an apostrophe", "o'brien@example.com", true],
  ["an underscore and hyphens", "user_name-1@example-domain.com", true],
  ["mixed case", "User@Example.COM", true],
  ["a punycode label under an ASCII top-level domain", "a@xn--mgbh0fb.com", true],
  ["an Arabic local part", "\u0628\u0627\u0633\u0644@example.com", false],
  ["an Arabic domain", "user@\u0645\u062B\u0627\u0644.com", false],
  ["an accented local part", "\u00E4@example.com", false],
  ["a Cyrillic local part", "\u043F\u043E\u043B\u044C@example.com", false],
  ["a punycode top-level domain", "user@example.xn--p1ai", false],
  ["a leading dot", ".user@example.com", false],
  ["a double dot", "us..er@example.com", false],
  ["a trailing dot before the @", "user.@example.com", false],
  ["an exclamation mark", "user!x@example.com", false],
  ["a domain label starting with a hyphen", "user@-example.com", false],
  ["a one-letter top-level domain", "user@example.c", false],
  ["no top-level domain", "user@example", false],
  ["surrounding whitespace", " user@example.com", false],
  ["an inner space", "user@exam ple.com", false],
];

/** Names each case by its outcome, never by its value, which may be invisible. */
const titled = (cases: ReadonlyArray<readonly [string, string, boolean]>) =>
  cases.map(([label, value, accepted]) => [`${label} is ${accepted ? "accepted" : "refused"}`, value, accepted] as const);

describe("new password character rule — printable ASCII only", () => {
  const validate = matchesPattern(newPasswordPolicy.characters, ENGLISH.validation.passwordCharacters);

  it.each(titled(PASSWORD_CASES))("%s", (_title, password, accepted) => {
    expect(validate(password, {})).toBe(accepted ? null : ENGLISH.validation.passwordCharacters);
  });
});

describe("email rule — the address the server accepts", () => {
  const validate = matchesPattern(emailRules.format, ENGLISH.validation.emailFormat);

  it.each(titled(EMAIL_CASES))("%s", (_title, email, accepted) => {
    expect(validate(email, {})).toBe(accepted ? null : ENGLISH.validation.emailFormat);
  });
});

// Exercises the exact validator the register form composes —
// matchesPattern(usernameRules.charset, message) — so this proves the field's
// behaviour rather than a bare regex constant.
describe("username charset rule — lowercase-only", () => {
  const validate = matchesPattern(usernameRules.charset, ENGLISH.validation.usernameCharset);

  it("accepts lowercase letters, digits, and underscores", () => {
    for (const u of ["basel_a", "user_123", "abcd", "a_b_c_9"]) {
      expect(validate(u, {})).toBeNull();
    }
  });

  it("rejects any uppercase letter (no silent normalization)", () => {
    for (const u of ["Basel_A", "USER", "aBc1", "basel_A"]) {
      expect(validate(u, {})).toBe(ENGLISH.validation.usernameCharset);
    }
  });

  it("the charset message names the lowercase constraint", () => {
    expect(ENGLISH.validation.usernameCharset.toLowerCase()).toContain("lowercase");
  });
});
