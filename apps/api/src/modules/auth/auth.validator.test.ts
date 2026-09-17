/**
 * registerSchema — lowercase-only username invariant (WI-B, #388).
 *
 * The username is validated as lowercase-only and is REJECTED, never normalized:
 * there is no `.toLowerCase()` transform, so a mixed-case value fails rather than
 * being silently coerced to a passing one. Login is untouched here (WI-E).
 */

import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./auth.validator";
import { requestResetSchema } from "./password-reset/passwordReset.validator";

const VALID = { username: "basel_a", email: "b@example.com", password: "Passw0rd!" };

const usernameError = (input: string): string | undefined => {
  const r = registerSchema.safeParse({ ...VALID, username: input });
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === "username")?.message;
};

describe("registerSchema — lowercase-only username (WI-B)", () => {
  it("accepts lowercase letters, digits, and underscores", () => {
    for (const u of ["basel_a", "user_123", "abcd", "a_b_c_9"]) {
      expect(registerSchema.safeParse({ ...VALID, username: u }).success).toBe(true);
    }
  });

  it("rejects any uppercase letter with the lowercase-charset message", () => {
    for (const u of ["Basel_A", "USER", "aBc1", "basel_A"]) {
      expect(usernameError(u)).toMatch(/lowercase/i);
    }
  });

  it("rejects rather than normalizes — no .toLowerCase() coercion", () => {
    // If a lowercasing transform existed, "MixedCase1" would be coerced and pass.
    // It must FAIL — proving rejection, not silent normalization.
    expect(registerSchema.safeParse({ ...VALID, username: "MixedCase1" }).success).toBe(false);
  });

  it("strips a sent name — registration is account-only", () => {
    const r = registerSchema.safeParse({ ...VALID, name: "Ignored" });
    expect(r.success).toBe(true);
    if (r.success) expect("name" in r.data).toBe(false);
  });
});

// The web tier's credentialRules.test.ts carries these same two tables, so both
// tiers are held to one set of outcomes. The outcomes are this tier's.
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

describe("registerSchema — a new password takes printable ASCII only", () => {
  const passwordIssues = (password: string) => {
    const r = registerSchema.safeParse({ ...VALID, password });
    return r.success ? [] : r.error.issues.filter((i) => i.path[0] === "password");
  };

  it.each(titled(PASSWORD_CASES))("%s", (_title, password, accepted) => {
    expect(passwordIssues(password)).toHaveLength(accepted ? 0 : 1);
    if (!accepted) expect(passwordIssues(password)[0].message).toMatch(/English letters/);
  });

  it("keeps a password's spaces rather than trimming them", () => {
    const r = registerSchema.safeParse({ ...VALID, password: " Passw0rd! " });
    expect(r.success && r.data.password).toBe(" Passw0rd! ");
  });
});

describe("loginSchema — a password is checked for presence only", () => {
  it("accepts a password the creation policy would refuse, so existing ones still sign in", () => {
    const r = loginSchema.safeParse({ identifier: "basel", password: "\u0643\u0644\u0645\u0629" });
    expect(r.success).toBe(true);
  });
});

describe.each([
  ["registerSchema", (email: string) => registerSchema.safeParse({ ...VALID, email }).success],
  ["requestResetSchema", (email: string) => requestResetSchema.safeParse({ email }).success],
] as const)("%s — the email rule the web tier mirrors", (_schema, accepts) => {
  it.each(titled(EMAIL_CASES))("%s", (_title, email, accepted) => {
    expect(accepts(email)).toBe(accepted);
  });
});
