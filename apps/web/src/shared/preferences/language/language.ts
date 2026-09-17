/**
 * Which language a reader gets, and the direction it reads in. The inline script in `index.html`
 * decides the same before the first paint, and a check holds the two together.
 */
const FALLBACK_LANGUAGE = "en";

// Named ahead of their catalogues: the direction is stamped before the first word is read.
const RIGHT_TO_LEFT_LANGUAGES: readonly string[] = ["ar"];

type Direction = "ltr" | "rtl";

export const directionOf = (language: string): Direction =>
  RIGHT_TO_LEFT_LANGUAGES.includes(language) ? "rtl" : "ltr";

interface LanguageSources {
  /** The reader's own choice, which the product wrote, so it must name a language exactly. */
  stored: string | null;
  /** The browser's languages in its order of preference, matched on their base language. */
  browser: readonly string[];
  /** The languages a catalogue exists for. */
  registered: readonly string[];
}

export const resolveLanguage = ({ stored, browser, registered }: LanguageSources): string => {
  if (stored !== null && registered.includes(stored)) return stored;

  const match = browser
    .map((tag) => tag.toLowerCase().split("-")[0])
    .find((base) => registered.includes(base));

  return match ?? FALLBACK_LANGUAGE;
};
