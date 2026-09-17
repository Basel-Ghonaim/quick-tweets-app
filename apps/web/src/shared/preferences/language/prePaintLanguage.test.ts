import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { browserLanguages } from "./browserLanguages";
import { directionOf, resolveLanguage } from "./language";
import { readStoredLanguage } from "./languageStorage";

// Decided twice, as the theme is: by an inline script before the first paint, and by this module
// after. They can share no code, so nothing but this keeps a reader from being turned around.

const STORAGE_KEY = "quick-tweets:language";

const languageScript = (): string => {
  const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((body) => body.includes(STORAGE_KEY));
  if (!script) throw new Error("no inline language script found in index.html");
  return script;
};

const declared = (script: string, name: string): unknown => {
  const literal = new RegExp(`var ${name} = (\\[[^\\]]*\\]|"[^"]*");`).exec(script)?.[1];
  if (!literal) throw new Error(`the language script declares no ${name}`);
  return JSON.parse(literal);
};

interface Scenario {
  languages: string[];
  /** `undefined` makes storage throw, as a privacy mode does. */
  stored: string | null | undefined;
  browser: { languages: string[] | undefined; language: string };
}

// Answers only to the product's key, so a side that reads any other key reads no choice at all.
const storageFor = (stored: Scenario["stored"]) => ({
  getItem: (key: string) => {
    if (stored === undefined) throw new Error("storage unavailable");
    return key === STORAGE_KEY ? stored : null;
  },
});

// The script is run with the scenario's languages in place of its own, so its decision is compared
// with the module's for sets it does not ship with yet.
const byScript = (script: string, { languages, stored, browser }: Scenario) => {
  const LANGUAGES = /var LANGUAGES = \[[^\]]*\];/;
  if (!LANGUAGES.test(script)) throw new Error("the language script declares no LANGUAGES");
  const source = script.replace(LANGUAGES, `var LANGUAGES = ${JSON.stringify(languages)};`);

  const attributes = new Map<string, string>();
  new Function("navigator", "document", "localStorage", source)(
    browser,
    { documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) } },
    storageFor(stored),
  );
  return { lang: attributes.get("lang"), dir: attributes.get("dir") };
};

const byModule = ({ languages, stored, browser }: Scenario) => {
  vi.stubGlobal("navigator", browser);
  vi.stubGlobal("window", { localStorage: storageFor(stored) });
  const choice = readStoredLanguage();
  const language = resolveLanguage({ stored: choice, browser: browserLanguages(), registered: languages });
  return { lang: language, dir: directionOf(language) };
};

const LANGUAGE_SETS = [["en"], ["en", "ar"], ["en", "ar", "fr"]];
const STORED = [undefined, null, "", "en", "ar", "fr", "EN", "ar-EG", "midnight"];
const BROWSERS = [
  { languages: [], language: "en-US" },
  { languages: undefined, language: "ar" },
  { languages: ["ar-EG", "en"], language: "ar-EG" },
  { languages: ["fr-CA", "ar"], language: "fr-CA" },
  { languages: ["EN-gb"], language: "EN-gb" },
  { languages: ["de", "ja-JP"], language: "de" },
];

const scenarios: Scenario[] = LANGUAGE_SETS.flatMap((languages) =>
  STORED.flatMap((stored) => BROWSERS.map((browser) => ({ languages, stored, browser }))),
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the language applied before first paint", () => {
  test("it declares the module's fallback and right-to-left languages", () => {
    const script = languageScript();
    const fallback = declared(script, "FALLBACK") as string;
    const rightToLeft = declared(script, "RIGHT_TO_LEFT") as string[];
    // Every language the script can stamp or names; a module-only entry is asked once it is served.
    const stamped = declared(script, "LANGUAGES") as string[];
    const asked = new Set([fallback, ...stamped, ...rightToLeft, ...LANGUAGE_SETS.flat()]);

    expect(resolveLanguage({ stored: null, browser: [], registered: [] })).toBe(fallback);
    for (const language of asked) {
      expect(directionOf(language), language).toBe(rightToLeft.includes(language) ? "rtl" : "ltr");
    }
  });

  test("it decides as the module does, on every path", () => {
    const script = languageScript();
    const decisions = scenarios.map((scenario) => {
      const expected = byModule(scenario);
      expect(byScript(script, scenario), JSON.stringify(scenario)).toEqual(expected);
      return `${expected.lang}/${expected.dir}`;
    });

    // Agreement is only worth something if the scenarios reach every outcome.
    expect(new Set(decisions)).toEqual(new Set(["en/ltr", "ar/rtl", "fr/ltr"]));
  });
});
